import {
  BAD_REQUEST, INTERNAL_SERVER_ERROR, UNAUTHORIZED,
  getStatusText
} from 'http-status-codes';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';
import { Logger } from '../logger';
import { Middleware } from '../middlewares';
import { Client } from '../services/client';
import { OAuth2Service } from '../services/oauth2';
import { UserService } from '../services/user';
import { ValidatorImpl as BaseValidatorImpl, Validator, ValidationError } from '../utils/validator';

import { Next, Context } from './context';
import { parseBody, EmptyBodyError, UnsupportedContentTypeError } from './utils/body-parser';
import { ClientAuthenticator, ClientAuthenticationFailedError } from './utils/client-authenticator';
import { Headers } from './utils/headers';


export interface OAuth2Controller {
  handleError: Middleware;
  postToken: Middleware;
}


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


class ValidatorImpl<T> extends BaseValidatorImpl<T> {
  public assert(val: T): asserts val is T {
    try {
      // @ts-ignore
      super.assert(val);
    } catch (err) {
      if (err instanceof ValidationError) {
        throw new InvalidRequestError(`Failed to validate body: ${err.message}`);
      }
      throw err;
    }
  }
}

const createValidator = <T>(schema: object): Validator<T> => new ValidatorImpl<T>(schema);


interface RequestBody {
  readonly grant_type: string;
}

const grantTypeValidator: Validator<RequestBody> = createValidator({
  type: 'object',
  required: ['grant_type'],
  properties: {
    grant_type: {
      type: 'string'
    }
  }
});


interface PasswordGrantBody {
  readonly grant_type: 'password';
  readonly username: string;
  readonly password: string;
  readonly scope: string;
}

const passwordGrantBodyValidator: Validator<PasswordGrantBody> = createValidator({
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


interface RefreshTokenGrantBody {
  readonly grant_type: 'refresh_token';
  readonly refresh_token: string;
  readonly scope: string;
}

const refreshTokenGrantBodyValidator: Validator<RefreshTokenGrantBody> = createValidator({
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


const isError = (val: unknown): val is Error & Readonly<Record<string, unknown>> =>
  val instanceof Error;

export class OAuth2ControllerImpl implements OAuth2Controller {
  private readonly _logger: Logger;
  private readonly _userService: UserService;
  private readonly _oauth2Service: OAuth2Service;
  private readonly _clientAuthenticator: ClientAuthenticator;

  public constructor(options: {
    logger: Logger;
    userService: UserService;
    oauth2Service: OAuth2Service;
    clientAuthenticator: ClientAuthenticator;
  }) {
    ({
      logger: this._logger,
      userService: this._userService,
      oauth2Service: this._oauth2Service,
      clientAuthenticator: this._clientAuthenticator
    } = options);
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
        isError(err) && typeof err.message === 'string'
          ? err.message
          : null;

      ctx.status = statusCode;
      ctx.set(headers);
      ctx.body = {
        error: errorCode,
        ...description === null ? {} : { description }
      };

      if (statusCode >= INTERNAL_SERVER_ERROR) {
        this._logger.error(err);
      }
    }
  }

  public async postToken(ctx: Context): Promise<void> {
    const client = await this._authenticateClient(ctx);
    const body = await this._parseFormBody(ctx);

    grantTypeValidator.assert(body);
    switch (body.grant_type) {
      case 'password': {
        await this._handlePasswordGrant(ctx, client, body);
        break;
      }
      case 'refresh_token': {
        await this._handleRefreshTokenGrant(ctx, client, body);
        break;
      }
      default: {
        throw new UnsupportedGrantTypeError('Only support password and refresh_token grant type');
      }
    }
  }

  private async _authenticateClient(ctx: Context): Promise<Client> {
    try {
      return await this._clientAuthenticator(ctx);
    } catch (err) {
      if (err instanceof ClientAuthenticationFailedError) {
        throw new InvalidClientError(`Failed to authenticate client: ${err.message}`);
      }
      throw err;
    }
  }

  private async _parseFormBody(ctx: Context): Promise<unknown> {
    try {
      return await parseBody(ctx, { json: false, form: true });
    } catch (err) {
      if (err instanceof EmptyBodyError || err instanceof UnsupportedContentTypeError) {
        throw new InvalidRequestError(`Failed to parse body: ${err.message}`);
      }
      throw err;
    }
  }

  private async _handlePasswordGrant(
    ctx: Context,
    client: Client,
    body: unknown
  ): Promise<void> {
    passwordGrantBodyValidator.assert(body);
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
  }

  private async _handleRefreshTokenGrant(
    ctx: Context,
    client: Client,
    body: unknown
  ): Promise<void> {
    refreshTokenGrantBodyValidator.assert(body);
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
  }
}


export const OAuth2Controller =
  createToken<Promise<OAuth2Controller>>(__filename, 'OAuth2Controller');

export const registerOAuth2Controller = createAsyncSingletonRegistrant(
  OAuth2Controller,
  {
    logger: Logger,
    userService: UserService,
    oauth2Service: OAuth2Service,
    clientAuthenticator: ClientAuthenticator
  },
  (opts) => new OAuth2ControllerImpl(opts)
);
