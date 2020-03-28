import { BAD_REQUEST, UNAUTHORIZED } from 'http-status-codes';

import { Client, ClientService } from '../../services/client';
import { wrapMethod } from '../../utils/method-wrapper';
import { Context } from '../context';
import { Headers } from '../headers';
import { Middleware } from '../middleware';


export class InvalidAuthorizationHeaderError extends Error {
  public readonly code = 'ERR_INVALID_AUTHORIZATION_HEADER';
  public readonly statusCode = BAD_REQUEST;
  public constructor() {
    super('Invalid Authorization header');
  }
}

export class InvalidClientCredentialError extends Error {
  public readonly code = 'ERR_CLIENT_AUTHENTICATION_FAILED';
  public readonly statusCode = UNAUTHORIZED;
  public readonly headers: Headers = { 'WWW-Authenticate': 'Basic' };
  public constructor() {
    super('Failed to authenticate client');
  }
}


export type ClientAuthenticationResult = {
  readonly type: 'failed';
  readonly error: Error;
} | {
  readonly type: 'successful';
  readonly client: Client;
};

const clientAuthenticationResultSym = Symbol('clientAuthenticationResult');

const setClientAuthenticationResult = (ctx: Context, result: ClientAuthenticationResult): void => {
  Reflect.defineMetadata(clientAuthenticationResultSym, result, ctx);
};

export const getClientAuthenticationResult = (ctx: Context): ClientAuthenticationResult => {
  const result: ClientAuthenticationResult | undefined =
    Reflect.getMetadata(clientAuthenticationResultSym, ctx);
  if (result === undefined) {
    throw new Error('Failed to retrieve client authentication result');
  }
  return result;
};

export const getAuthenticatedClient = (ctx: Context): Client => {
  const result = getClientAuthenticationResult(ctx);
  if (result.type === 'failed') {
    Error.captureStackTrace(result.error, getAuthenticatedClient);
    throw result.error;
  }
  return result.client;
};


export const useClientAuthenticator$clientServiceSym = Symbol('useClientAuthenticator$clientServiceSym');

declare abstract class UseClientAuthenticator {
  public constructor(...args: Array<any>);
  protected abstract readonly [useClientAuthenticator$clientServiceSym]: ClientService;
}

const useClientAuthenticatorPrototypes = new WeakSet<object>();

const instanceofUseClientAuthenticator = (val: unknown): val is UseClientAuthenticator => {
  if (typeof val === 'object' && val !== null) {
    for (
      let proto = Reflect.getPrototypeOf(val);
      proto !== null;
      proto = Reflect.getPrototypeOf(proto)
    ) {
      if (useClientAuthenticatorPrototypes.has(proto)) return true;
    }
  }
  return false;
};

export const useAuthenticateClient =
  <T extends Function>(base: T): (typeof UseClientAuthenticator) & T => {
    abstract class AbstractUseClientAuthenticator extends (base as any) {
      protected abstract readonly [useClientAuthenticator$clientServiceSym]: ClientService;
    }
    useClientAuthenticatorPrototypes.add(AbstractUseClientAuthenticator.prototype);
    return AbstractUseClientAuthenticator as any;
  };


const authenticateClientInternal = async (
  ctx: Context,
  clientService: ClientService
): Promise<ClientAuthenticationResult> => {
  const auth = ctx.get('Authorization');

  let publicId: string | null = null;
  let secret: string | null = null;
  if (auth !== undefined && auth.startsWith('Basic ')) {
    const encoded = auth.slice('Basic '.length);
    let decoded: string | null;
    try {
      decoded = Buffer.from(encoded, 'base64').toString();
    } catch {
      decoded = null;
    }
    const parts = decoded?.split(':', 2) ?? null;
    if (parts?.length === 2) {
      [publicId, secret] = parts;
    }
  }
  if (publicId === null || secret === null) {
    return {
      type: 'failed',
      error: new InvalidAuthorizationHeaderError()
    };
  }

  const client = await clientService.findByCredentials({
    publicId,
    secret
  });
  if (client === null) {
    return {
      type: 'failed',
      error: new InvalidClientCredentialError()
    };
  }

  return {
    type: 'successful',
    client
  };
};

export const authenticateClient =
  (options?: { noThrow?: boolean }): MethodDecorator => {
    const { noThrow = false } = options ?? {};

    return wrapMethod((method, target) => {
      if (!instanceofUseClientAuthenticator(target)) {
        throw new Error('@authenticateClient can only be used in class which extends useAuthenticateClient()');
      }

      const authenticateClientHandler: Middleware = async function(
        this: UseClientAuthenticator,
        ctx,
        next
      ) {
        const result = await authenticateClientInternal(
          ctx,
          this[useClientAuthenticator$clientServiceSym]
        );
        setClientAuthenticationResult(ctx, result);
        if (!noThrow && result.type === 'failed') {
          Error.captureStackTrace(result.error, authenticateClientHandler);
          throw result.error;
        }
        return Reflect.apply(method, this, [ctx, next]);
      };
      return authenticateClientHandler;
    });
  };
