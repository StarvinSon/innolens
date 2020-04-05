import { UNAUTHORIZED } from 'http-status-codes';

import { Client, ClientService } from '../../services/client';
import { OAuth2Service, OAuth2Token } from '../../services/oauth2';
import { User, UserService } from '../../services/user';
import { wrapMethod } from '../../utils/method-wrapper';
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


export type UserAuthenticationResult = {
  readonly type: 'failed';
  readonly error: Error;
} | {
  readonly type: 'successful';
  readonly oauth2Token: OAuth2Token;
  readonly getClient: () => Promise<Client>;
  readonly getUser: () => Promise<User>;
};

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

export const getOAuth2Token = (ctx: Context): OAuth2Token => {
  const result = getUserAuthenticationResult(ctx);
  if (result.type === 'failed') {
    Error.captureStackTrace(result.error, getOAuth2Token);
    throw result.error;
  }
  return result.oauth2Token;
};

export const getAuthenticatedUser = async (ctx: Context): Promise<User> => {
  const result = getUserAuthenticationResult(ctx);
  if (result.type === 'failed') {
    Error.captureStackTrace(result.error, getAuthenticatedUser);
    throw result.error;
  }
  return result.getUser();
};


export const useAuthenticateUser$oauth2ServiceSym = Symbol('useAuthenticateUser$oauth2Service');
export const useAuthenticateUser$clientServiceSym = Symbol('useAuthenticateUser$clientService');
export const useAuthenticateUser$userServiceSym = Symbol('useAuthenticateUser$userService');

declare abstract class UseAuthenticateUser {
  public constructor(...args: Array<any>);
  protected abstract readonly [useAuthenticateUser$oauth2ServiceSym]: OAuth2Service;
  protected abstract readonly [useAuthenticateUser$clientServiceSym]: ClientService;
  protected abstract readonly [useAuthenticateUser$userServiceSym]: UserService;
}

const useAuthenticateUserPrototypes = new WeakSet<object>();

const instanceOfUseAuthenticateUser = (val: unknown): val is UseAuthenticateUser => {
  if (typeof val === 'object' && val !== null) {
    for (
      let proto = Reflect.getPrototypeOf(val);
      proto !== null;
      proto = Reflect.getPrototypeOf(proto)
    ) {
      if (useAuthenticateUserPrototypes.has(proto)) return true;
    }
  }
  return false;
};

export const useAuthenticateUser =
  <T extends Function>(base: T): (typeof UseAuthenticateUser) & T => {
    abstract class AbstractUseAuthenticateUser extends (base as any) {
      protected abstract readonly [useAuthenticateUser$oauth2ServiceSym]: OAuth2Service;
      protected abstract readonly [useAuthenticateUser$clientServiceSym]: ClientService;
      protected abstract readonly [useAuthenticateUser$userServiceSym]: UserService;
    }
    useAuthenticateUserPrototypes.add(AbstractUseAuthenticateUser.prototype);
    return AbstractUseAuthenticateUser as any;
  };


const authenticate = async (
  ctx: Context,
  oauth2Service: OAuth2Service,
  clientService: ClientService,
  userService: UserService
): Promise<UserAuthenticationResult> => {
  const auth = ctx.get('Authorization');

  if (auth === undefined || !auth.startsWith('Bearer ')) {
    return {
      type: 'failed',
      error: new MissingAccessTokenError()
    };
  }
  const accessToken = auth.slice('Bearer '.length);

  const oauth2Token = await oauth2Service.findByAccessToken(accessToken);
  if (oauth2Token === null) {
    return {
      type: 'failed',
      error: new InvalidAccessTokenError()
    };
  }

  return {
    type: 'successful',
    oauth2Token,
    getClient: async () => {
      const client = await clientService.findById(oauth2Token.clientId);
      if (client === null) {
        throw new Error('Failed to retrieve client from db');
      }
      return client;
    },
    getUser: async () => {
      const user = await userService.findById(oauth2Token.userId);
      if (user === null) {
        throw new Error('Failed to retrieve user from db');
      }
      return user;
    }
  };
};

export const authenticateUser =
  (options?: { noThrow?: boolean }): MethodDecorator => {
    const { noThrow = false } = options ?? {};

    return wrapMethod((method, target) => {
      if (!instanceOfUseAuthenticateUser(target)) {
        throw new Error('@authenticateUser can only be used in subclass of UseAuthenticateUser');
      }

      const authenticateClientHandler: Middleware = async function(
        this: UseAuthenticateUser,
        ctx,
        next
      ) {
        const result = await authenticate(
          ctx,
          this[useAuthenticateUser$oauth2ServiceSym],
          this[useAuthenticateUser$clientServiceSym],
          this[useAuthenticateUser$userServiceSym]
        );
        setUserAuthenticationResult(ctx, result);
        if (!noThrow && result.type === 'failed') {
          Error.captureStackTrace(result.error, authenticateClientHandler);
          throw result.error;
        }
        return Reflect.apply(method, this, [ctx, next]);
      };
      return authenticateClientHandler;
    });
  };
