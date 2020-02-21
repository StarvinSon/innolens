import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import {
  BAD_REQUEST, INTERNAL_SERVER_ERROR, UNAUTHORIZED,
  getStatusText
} from 'http-status-codes';

import { Logger } from '../logger';
import { OAuth2Service } from '../services/oauth2';
import { UserService } from '../services/user';

import { Next, Context } from './context';
import { Headers } from './headers';
import { Middleware } from './middleware';
import {
  parseBody, EmptyBodyError, UnsupportedContentTypeError,
  InjectedBodyParserFactory,
  initializeParseBody
} from './utils/body-parser';
import {
  validateBody, getValidatedBody, BodyValidationError,
  InjectedBodyValidatorFactory,
  initializeValidateBody
} from './utils/body-validator';
import {
  ClientAuthenticator, authenticateClient, InvalidClientCredentialError,
  InvalidAuthorizationHeaderError, getAuthenticatedClient, initializeAuthenticateClient
} from './utils/client-authenticator';
import { mapError } from './utils/error-configurator';


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


export interface OAuth2Controller {
  handleError: Middleware;
  postToken: Middleware;
}

export const OAuth2Controller = createToken<OAuth2Controller>('OAuth2Controller');


interface PostTokenBody {
  readonly grant_type: string;
}

const PostTokenBody: object = {
  type: 'object',
  required: ['grant_type'],
  properties: {
    grant_type: {
      type: 'string'
    }
  }
};


interface PostPasswordGrantBody {
  readonly grant_type: 'password';
  readonly username: string;
  readonly password: string;
  readonly scope: string;
}

const PostPasswordGrantBody: object = {
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
};


interface PostRefreshTokenGrantBody {
  readonly grant_type: 'refresh_token';
  readonly refresh_token: string;
  readonly scope: string;
}

const PostRefreshTokenGrantBody: object = {
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
};


const parseScope = (str: string): Array<string> => Array
  .from(str.matchAll(/[^\s]+/g))
  .map((match) => match[0]);

const isError = (val: unknown): val is Error & Readonly<Record<string, unknown>> =>
  val instanceof Error;

@injectableConstructor({
  logger: Logger,
  userService: UserService,
  oauth2Service: OAuth2Service,
  clientAuthenticator: ClientAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory,
  injectedBodyValidatorFactory: InjectedBodyValidatorFactory
})
@singleton()
export class OAuth2ControllerImpl implements OAuth2Controller {
  private readonly _logger: Logger;
  private readonly _userService: UserService;
  private readonly _oauth2Service: OAuth2Service;

  public constructor(deps: {
    logger: Logger;
    userService: UserService;
    oauth2Service: OAuth2Service;
    clientAuthenticator: ClientAuthenticator;
    injectedBodyParserFactory: InjectedBodyParserFactory;
    injectedBodyValidatorFactory: InjectedBodyValidatorFactory;
  }) {
    ({
      logger: this._logger,
      userService: this._userService,
      oauth2Service: this._oauth2Service
    } = deps);
    initializeAuthenticateClient(OAuth2ControllerImpl, this, deps.clientAuthenticator);
    initializeParseBody(OAuth2ControllerImpl, this, deps.injectedBodyParserFactory);
    initializeValidateBody(OAuth2ControllerImpl, this, deps.injectedBodyValidatorFactory);
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
  @parseBody({ json: false, form: true })
  @validateBody(PostTokenBody)
  public async postToken(ctx: Context): Promise<void> {
    const body = getValidatedBody<PostTokenBody>(ctx);
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

  @validateBody(PostPasswordGrantBody)
  private async _handlePasswordGrant(ctx: Context): Promise<void> {
    const client = getAuthenticatedClient(ctx);

    const body = getValidatedBody<PostPasswordGrantBody>(ctx);
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

  @validateBody(PostRefreshTokenGrantBody)
  private async _handleRefreshTokenGrant(ctx: Context): Promise<void> {
    const body = getValidatedBody<PostRefreshTokenGrantBody>(ctx);
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
