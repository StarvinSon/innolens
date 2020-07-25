import * as Api from '@innolens/api-legacy/lib-node';
import { singleton, injectableConstructor } from '@innolens/resolver/lib-node';
import {
  BAD_REQUEST, INTERNAL_SERVER_ERROR, UNAUTHORIZED,
  getStatusText
} from 'http-status-codes';

import { Logger } from '../logger';
import { ClientService } from '../services/client';
import { OAuth2Service } from '../services/oauth2';
import { UserService } from '../services/user';

import { Next, Context } from './context';
import { Headers } from './headers';
import {
  authenticateClient, InvalidClientCredentialError,
  InvalidAuthorizationHeaderError, getAuthenticatedClient, useAuthenticateClient,
  useClientAuthenticator$clientServiceSym
} from './utils/client-authenticator';
import { mapError } from './utils/error-configurator';
import { getRequestBody } from './utils/request-body';
import {
  parseRequestBody, EmptyBodyError, UnsupportedContentTypeError,
  useParseRequestBody,
  useParseRequestBody$loggerSym
} from './utils/request-body-parser';
import {
  validateRequestBody, BodyValidationError
} from './utils/request-body-validator';
import { validateResponseBody } from './utils/response-body-validator';


class InvalidRequestError extends Error {
  public readonly code = 'ERR_INVALID_REQUEST';
  public readonly statusCode = BAD_REQUEST;
  public constructor(message: string) {
    super(message);
  }
}

class InvalidClientError extends Error {
  public readonly code = 'ERR_INVALID_CLIENT';
  public readonly statusCode = UNAUTHORIZED;
  public readonly headers: Headers = { 'WWW-Authenticate': 'Basic' };
  public constructor(message: string) {
    super(message);
  }
}

class InvalidGrantError extends Error {
  public readonly code = 'ERR_INVALID_GRANT';
  public readonly statusCode = BAD_REQUEST;
  public constructor(message: string) {
    super(message);
  }
}

class UnsupportedGrantTypeError extends Error {
  public readonly code = 'ERR_UNSUPPORTED_GRANT_TYPE';
  public readonly statusCode = BAD_REQUEST;
  public constructor(message: string) {
    super(message);
  }
}


const parseScope = (str: string): Array<string> => Array
  .from(str.matchAll(/[^\s]+/g))
  .map((match) => match[0]);

const isError = (val: unknown): val is Error & Readonly<Record<string, unknown>> =>
  val instanceof Error;

@injectableConstructor({
  oauth2Service: OAuth2Service,
  userService: UserService,
  clientService: ClientService,
  logger: Logger
})
@singleton()
export class OAuth2Controller extends useParseRequestBody(useAuthenticateClient(Object)) {
  private readonly _oauth2Service: OAuth2Service;
  private readonly _userService: UserService;
  private readonly _logger: Logger;

  protected readonly [useClientAuthenticator$clientServiceSym]: ClientService;
  protected readonly [useParseRequestBody$loggerSym]: Logger;

  public constructor(deps: {
    oauth2Service: OAuth2Service;
    userService: UserService;
    clientService: ClientService;
    logger: Logger;
  }) {
    super();
    ({
      oauth2Service: this._oauth2Service,
      userService: this._userService,
      logger: this._logger,
      clientService: this[useClientAuthenticator$clientServiceSym],
      logger: this[useParseRequestBody$loggerSym]
    } = deps);
  }

  public async handleError(ctx: Context, next: Next): Promise<void> {
    ctx.set({
      'Pragma': 'no-cache', // eslint-disable-line quote-props
      'Cache-Control': 'no-store'
    });
    try {
      await next();
    } catch (err) {
      const statusCode: number =
        isError(err) && typeof err.statusCode === 'number'
          ? err.statusCode
          : isError(err) && typeof err.status === 'number'
            ? err.status
            : INTERNAL_SERVER_ERROR;
      const headers: Headers =
        isError(err) && typeof err.headers === 'object' && err.headers !== null
          ? err.headers as Headers
          : {};
      const errorCode: string =
        statusCode < INTERNAL_SERVER_ERROR && isError(err) && typeof err.code === 'string'
          ? err.code.toLowerCase().replace(/^err_/, '')
          : getStatusText(statusCode).replace(' ', '_').toLowerCase();
      const description: string | null =
        statusCode < INTERNAL_SERVER_ERROR && isError(err) && typeof err.message === 'string'
          ? err.message
          : null;

      ctx.status = statusCode;
      ctx.set(headers);
      ctx.body = {
        error: errorCode,
        ...description === null ? {} : { description }
      };

      if (statusCode >= INTERNAL_SERVER_ERROR) {
        this._logger.error('%O', err);
      }
    }
  }

  @mapError([
    [
      [InvalidAuthorizationHeaderError, InvalidClientCredentialError],
      (err) => new InvalidClientError(`Failed to authenticate client: ${err.message}`)
    ],
    [
      [EmptyBodyError, UnsupportedContentTypeError, BodyValidationError],
      (err) => new InvalidRequestError(`Failed to parse body: ${err.message}`)
    ]
  ])
  @authenticateClient()
  @parseRequestBody('application/x-www-form-urlencoded')
  @validateRequestBody(Api.OAuth2.PostToken.Base.requestBodyJsonSchema)
  public async postToken(ctx: Context): Promise<void> {
    const body = Api.OAuth2.PostToken.Base.fromRequestBodyJson(getRequestBody(ctx));
    switch (body.grant_type) {
      case 'password': {
        return this._handlePasswordGrant(ctx);
      }
      case 'refresh_token': {
        return this._handleRefreshTokenGrant(ctx);
      }
      default: {
        throw new UnsupportedGrantTypeError('Only support password and refresh_token grant type');
      }
    }
  }

  @validateRequestBody(Api.OAuth2.PostToken.Password.requestBodyJsonSchema)
  @validateResponseBody(Api.OAuth2.PostToken.Password.responseBodyJsonSchema)
  private async _handlePasswordGrant(ctx: Context): Promise<void> {
    const client = getAuthenticatedClient(ctx);

    const body = Api.OAuth2.PostToken.Password.fromRequestBodyJson(getRequestBody(ctx));
    const { username, password } = body;

    const scopes = parseScope(body.scope);
    if (!this._oauth2Service.verifyScopes(scopes)) {
      throw new InvalidRequestError('Invalid scope');
    }

    const user = await this._userService.findByCredentials({ username, password });
    if (user === null) {
      throw new InvalidGrantError('Invalid user credentials');
    }

    const token = await this._oauth2Service.createAccessToken({
      clientId: client._id,
      userId: user._id,
      scopes
    });

    ctx.body = Api.OAuth2.PostToken.Password.toResponseBodyJson({
      access_token: token.accessToken,
      token_type: 'Bearer',
      expires_in: Math.max(
        0,
        Math.floor((token.accessTokenExpireDate.getTime() - Date.now()) / 1000)
      ),
      scope: token.scopes.join(' '),
      refresh_token: token.refreshToken ?? undefined
    });
  }

  @validateRequestBody(Api.OAuth2.PostToken.Refresh.requestBodyJsonSchema)
  @validateResponseBody(Api.OAuth2.PostToken.Refresh.responseBodyJsonSchema)
  private async _handleRefreshTokenGrant(ctx: Context): Promise<void> {
    const body = Api.OAuth2.PostToken.Refresh.fromRequestBodyJson(getRequestBody(ctx));
    const { refresh_token: refreshToken } = body;

    const scopes = parseScope(body.scope);
    if (!this._oauth2Service.verifyScopes(scopes)) {
      throw new InvalidRequestError('Invalid scope');
    }

    const currentTime = new Date();

    const currentToken = await this._oauth2Service.findByRefreshToken(refreshToken, currentTime);
    if (currentToken === null) {
      throw new InvalidGrantError('Invalid refresh token');
    }

    if (scopes.some((s) => !currentToken.scopes.includes(s))) {
      throw new InvalidRequestError('Refreshed scope must be equal or narrower than the current scope');
    }

    if (!(await this._oauth2Service.revokeByRefreshToken(refreshToken, currentTime))) {
      /* The token has just been revoked after findOneByRefreshToken
       * and before revokeByRefreshToken. */
      throw new InvalidGrantError('Invalid refresh token');
    }

    const newToken = await this._oauth2Service.createAccessToken({
      clientId: currentToken.clientId,
      userId: currentToken.userId,
      scopes
    });

    ctx.body = Api.OAuth2.PostToken.Refresh.toResponseBodyJson({
      access_token: newToken.accessToken,
      token_type: 'Bearer',
      expires_in: Math.max(
        0,
        Math.floor((newToken.accessTokenExpireDate.getTime() - Date.now()) / 1000)
      ),
      scope: newToken.scopes.join(' '),
      refresh_token: newToken.refreshToken ?? undefined
    });
  }
}
