import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import { UNAUTHORIZED } from 'http-status-codes';

import { Client, ClientService } from '../../services/client';
import { OAuth2Service, OAuth2Token } from '../../services/oauth2';
import { User, UserService } from '../../services/user';
import { wrapMethodFactory, createMethodInitializer } from '../../utils/method-wrapper';
import { Context } from '../context';
import { Headers } from '../headers';
import { Middleware } from '../middleware';


export class MissingAccessTokenError extends Error {
  public readonly code = 'ERR_MISSING_ACCESS_TOKEN';
  public readonly statusCode = UNAUTHORIZED;
  public readonly headers: Headers = { 'WWW-Authenticate': 'Bearer' };
  public constructor() {
    super('Missing access token');
  }
}

export class InvalidAccessTokenError extends Error {
  public readonly code = 'ERR_INVALID_ACCESS_TOKEN';
  public readonly statusCode = UNAUTHORIZED;
  public readonly headers: Headers = { 'WWW-Authenticate': 'Bearer' };
  public constructor() {
    super('Invalid access token');
  }
}


export interface UserAuthenticator {
  authenticate(ctx: Context): Promise<UserAuthenticationResult>;
  authenticateOrThrow(ctx: Context): Promise<SuccessfulUserAuthenticationResult>;
}

export const UserAuthenticator = createToken<UserAuthenticator>('UserAuthenticator');

export type UserAuthenticationResult =
  FailedUserAuthenticationResult | SuccessfulUserAuthenticationResult;

export interface FailedUserAuthenticationResult {
  type: 'FAILED';
  error: Error;
}

export interface SuccessfulUserAuthenticationResult {
  type: 'SUCCESSFUL';
  oauth2Token: OAuth2Token;
  getClient(): Promise<Client>;
  getUser(): Promise<User>;
}

@injectableConstructor({
  oauth2Service: OAuth2Service,
  clientService: ClientService,
  userService: UserService
})
@singleton()
export class UserAuthenticatorImpl implements UserAuthenticator {
  private readonly _oauth2Service: OAuth2Service;
  private readonly _clientService: ClientService;
  private readonly _userService: UserService;

  public constructor(deps: {
    oauth2Service: OAuth2Service,
    clientService: ClientService
    userService: UserService;
  }) {
    ({
      oauth2Service: this._oauth2Service,
      clientService: this._clientService,
      userService: this._userService
    } = deps);
  }

  public async authenticate(ctx: Context): Promise<UserAuthenticationResult> {
    const auth = ctx.get('Authorization');

    if (auth === undefined || !auth.startsWith('Bearer ')) {
      return {
        type: 'FAILED',
        error: new MissingAccessTokenError()
      };
    }
    const accessToken = auth.slice('Bearer '.length);

    const oauth2Token = await this._oauth2Service.findByAccessToken(accessToken);
    if (oauth2Token === null) {
      return {
        type: 'FAILED',
        error: new InvalidAccessTokenError()
      };
    }

    return {
      type: 'SUCCESSFUL',
      oauth2Token,
      getClient: async () => {
        const client = await this._clientService.findById(oauth2Token.clientId);
        if (client === null) {
          throw new Error('Failed to retrieve client from db');
        }
        return client;
      },
      getUser: async () => {
        const user = await this._userService.findById(oauth2Token.userId);
        if (user === null) {
          throw new Error('Failed to retrieve user from db');
        }
        return user;
      }
    };
  }

  public async authenticateOrThrow(ctx: Context): Promise<SuccessfulUserAuthenticationResult> {
    const result = await this.authenticate(ctx);
    if (result.type === 'FAILED') {
      Error.captureStackTrace(result.error, this.authenticateOrThrow);
      throw result.error;
    }
    return result;
  }
}


const userAuthenticationResultSym = Symbol('userAuthenticationResult');

const setUserAuthenticationResult = (ctx: Context, result: UserAuthenticationResult): void => {
  Reflect.defineMetadata(userAuthenticationResultSym, result, ctx);
};

export const getUserAuthenticationResult = (ctx: Context): UserAuthenticationResult => {
  const result: UserAuthenticationResult | undefined =
    Reflect.getMetadata(userAuthenticationResultSym, ctx);
  if (result === undefined) {
    throw new Error('Failed to retrieve user authentication result');
  }
  return result;
};

// eslint-disable-next-line max-len
export const getSuccessfulUserAuthenticationResult = (ctx: Context): SuccessfulUserAuthenticationResult => {
  const result = getUserAuthenticationResult(ctx);
  if (result.type === 'FAILED') {
    Error.captureStackTrace(result.error, getSuccessfulUserAuthenticationResult);
    throw result.error;
  }
  return result;
};

export const getAuthenticatedUser = async (ctx: Context): Promise<User> =>
  getSuccessfulUserAuthenticationResult(ctx).getUser();


type AuthenticateUserInitializerArgs = [UserAuthenticator];

const authenticateUserName = 'authenticateUserName';
const authenticateUserInitializersSym = Symbol('authenticateUserInitializers');

export const authenticateUser =
  (options?: { noThrow?: boolean }): MethodDecorator => {
    const noThrow = options?.noThrow ?? false;

    return wrapMethodFactory<AuthenticateUserInitializerArgs>(
      authenticateUserName,
      authenticateUserInitializersSym,
      (method) => ($this, authenticator) => {
        const authenticateClientHandler: Middleware = async function(this: object, ctx, next) {
          const result = await authenticator.authenticate(ctx);
          setUserAuthenticationResult(ctx, result);
          if (!noThrow && result.type === 'FAILED') {
            Error.captureStackTrace(result.error, authenticateClientHandler);
            throw result.error;
          }
          return Reflect.apply(method, this, [ctx, next]);
        };
        return authenticateClientHandler;
      }
    );
  };

export const initializeAuthenticateUser =
  createMethodInitializer<AuthenticateUserInitializerArgs>(
    authenticateUserName,
    authenticateUserInitializersSym
  );
