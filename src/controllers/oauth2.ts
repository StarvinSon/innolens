import { BAD_REQUEST, INTERNAL_SERVER_ERROR, getStatusText } from 'http-status-codes';

import { createToken, createSingletonDependencyRegistrant, DependencyCreator } from '../app-context';
import { Logger } from '../log';
import { Middleware } from '../middlewares';
import { OAuth2Service } from '../services/oauth2';
import { UsersService } from '../services/users';
import { createError } from '../utils/error';


import { ERR_EMPTY_BODY, ERR_UNSUPPORTED_CONTENT_TYPE, parseBody } from './utils/body-parser';
import { createClientAuthenticator, ERR_CLIENT_AUTHENTICATION_FAILED } from './utils/client-authenticator';
import { createValidator, Validator, ERR_VALIDATION_FAILED } from './utils/validator';


export const ERR_INVALID_REQUEST = 'invalid_request';
export const ERR_INVALID_CLIENT = 'invalid_client';
export const ERR_INVALID_GRANT = 'invalid_grant';
export const ERR_UNSUPPORTED_GRANT_TYPE = 'unsupported_grant_type';


export interface OAuth2Controller {
  handleError: Middleware;
  postToken: Middleware;
}

export const OAuth2Controller = createToken<Promise<OAuth2Controller>>(module, 'OAuth2Controller');

// eslint-disable-next-line max-len
export const createOAuth2Controller: DependencyCreator<Promise<OAuth2Controller>> = async (appCtx) => {
  const [
    logger,
    usersService,
    oauth2Service,
    authenticateClient
  ] = await appCtx.resolveAllAsync(
    Logger,
    UsersService,
    OAuth2Service,
    createClientAuthenticator
  );

  const validateGrantType: Validator<{
    readonly grant_type: string;
  }> = createValidator({
    type: 'object',
    required: ['grant_type'],
    properties: {
      grant_type: {
        type: 'string'
      }
    }
  });

  const validatePassword: Validator<{
    readonly grant_type: 'password';
    readonly username: string;
    readonly password: string;
    readonly scope: string;
  }> = createValidator({
    type: 'object',
    required: ['grant_type', 'username', 'password', 'scope'],
    additionalProperties: false,
    properties: {
      grant_type: {
        const: 'password'
      },
      username: {
        type: 'string'
      },
      password: {
        type: 'string'
      },
      scope: {
        type: 'string'
      }
    }
  });

  const validateRefresh: Validator<{
    readonly grant_type: 'refresh_token';
    readonly refresh_token: string;
    readonly scope: string;
  }> = createValidator({
    type: 'object',
    required: ['grant_type', 'refresh_token', 'scope'],
    additionalProperties: false,
    properties: {
      grant_type: {
        const: 'refresh_token'
      },
      refresh_token: {
        type: 'string'
      },
      scope: {
        type: 'string'
      }
    }
  });

  const parseScope = (str: string): Array<string> => Array
    .from(str.matchAll(/[^\s]+/g))
    .map((match) => match[0]);

  const handleError: Middleware = async (ctx, next) => {
    ctx.set({
      'Pragma': 'no-cache', // eslint-disable-line quote-props
      'Cache-Control': 'no-store'
    });
    try {
      await next();
    } catch (err) {
      const statusCode: number = err.statusCode ?? err.status ?? INTERNAL_SERVER_ERROR;
      const headers: { readonly [key: string]: string } = err.headers ?? {};
      const errorCode: string = err.errorCode ?? getStatusText(statusCode).replace(' ', '_').toUpperCase();
      const description: string | null = err.description ?? null;

      ctx.status = statusCode;
      ctx.set(headers);
      ctx.body = {
        error: errorCode,
        ...description === null ? {} : { description }
      };

      if (statusCode >= INTERNAL_SERVER_ERROR) {
        logger.error(err);
      }
    }
  };

  const postToken: Middleware = async (ctx) => {
    const client = await authenticateClient(ctx)
      .catch((err) => {
        if (err.errorCode === ERR_CLIENT_AUTHENTICATION_FAILED) {
          // eslint-disable-next-line no-param-reassign
          err.errorCode = ERR_INVALID_CLIENT;
        }
        throw err;
      });

    const body = await parseBody(ctx, { json: false, form: true })
      .catch((err) => {
        switch (err.errorCode) {
          case ERR_EMPTY_BODY:
          case ERR_UNSUPPORTED_CONTENT_TYPE: {
            // eslint-disable-next-line no-param-reassign
            err.errorCode = ERR_INVALID_REQUEST;
          }
          // no default
        }
        throw err;
      });

    try {
      validateGrantType(body);
    } catch (err) {
      if (err.errorCode === ERR_VALIDATION_FAILED) {
        err.errorCode = ERR_INVALID_REQUEST;
      }
      throw err;
    }

    switch (body.grant_type) {
      case 'password': {
        try {
          validatePassword(body);
        } catch (err) {
          if (err.errorCode === ERR_VALIDATION_FAILED) {
            err.errorCode = ERR_INVALID_REQUEST;
          }
          throw err;
        }

        const { username, password } = body;
        const scopes = parseScope(body.scope);

        const user = await usersService.findByCredentials({ username, password });
        if (user === null) {
          throw createError({
            statusCode: BAD_REQUEST,
            errorCode: ERR_INVALID_GRANT,
            description: 'Failed to verify user credentials'
          });
        }

        if (!oauth2Service.verifyScopes(scopes)) {
          throw createError({
            statusCode: BAD_REQUEST,
            errorCode: ERR_INVALID_REQUEST,
            description: 'Invalid scope'
          });
        }

        const token = await oauth2Service.createAccessToken({
          clientId: client._id,
          userId: user._id,
          scopes
        });

        ctx.body = {
          access_token: token.accessToken,
          token_type: 'Bearer',
          expires_in: Math.max(
            0,
            Math.floor((token.accessTokenExpireDate.getTime() - Date.now()) / 1000)
          ),
          scope: token.scopes.join(' '),
          refresh_token: token.refreshToken
        };
        break;
      }
      case 'refresh_token': {
        try {
          validateRefresh(body);
        } catch (err) {
          if (err.errorCode === ERR_VALIDATION_FAILED) {
            err.errorCode = ERR_INVALID_REQUEST;
          }
          throw err;
        }

        const { refresh_token: refreshToken } = body;
        const scopes = parseScope(body.scope);

        if (!oauth2Service.verifyScopes(scopes)) {
          throw createError({
            statusCode: BAD_REQUEST,
            errorCode: ERR_INVALID_REQUEST,
            description: 'Invalid scope'
          });
        }

        const currentDate = new Date();

        const currentToken = await oauth2Service.findByRefreshToken(refreshToken, currentDate);
        if (currentToken === null) {
          throw createError({
            statusCode: BAD_REQUEST,
            errorCode: ERR_INVALID_GRANT,
            description: 'Invalid refresh token'
          });
        }

        if (scopes.some((s) => !currentToken.scopes.includes(s))) {
          throw createError({
            statusCode: BAD_REQUEST,
            errorCode: ERR_INVALID_REQUEST,
            description: 'Refreshed scope must be equal or narrower than the current scope'
          });
        }

        if (!(await oauth2Service.revokeByRefreshToken(refreshToken, currentDate))) {
          /* The token has just been revoked after findOneByRefreshToken
           * and before revokeByRefreshToken
           */
          throw createError({
            statusCode: BAD_REQUEST,
            errorCode: ERR_INVALID_GRANT,
            description: 'Invalid refresh token'
          });
        }

        const newToken = await oauth2Service.createAccessToken({
          clientId: currentToken.clientId,
          userId: currentToken.userId,
          scopes
        });

        ctx.body = {
          access_token: newToken.accessToken,
          token_type: 'Bearer',
          expires_in: Math.max(
            0,
            Math.floor((newToken.accessTokenExpireDate.getTime() - Date.now()) / 1000)
          ),
          scope: newToken.scopes.join(' '),
          refresh_token: newToken.refreshToken
        };
        break;
      }
      default: {
        throw createError({
          statusCode: BAD_REQUEST,
          errorCode: ERR_UNSUPPORTED_GRANT_TYPE,
          description: 'only support password and refresh_token grant type'
        });
      }
    }
  };

  return {
    handleError,
    postToken
  };
};

// eslint-disable-next-line max-len
export const registerOAuth2Controller = createSingletonDependencyRegistrant(OAuth2Controller, createOAuth2Controller);
