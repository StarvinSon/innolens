import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import { BAD_REQUEST, UNAUTHORIZED } from 'http-status-codes';

import { Client, ClientService } from '../../services/client';
import { wrapMethodFactory, createMethodInitializer } from '../../utils/method-wrapper';
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


export interface ClientAuthenticator {
  authenticate(ctx: Context): Promise<ClientAuthenticationResult>;
  authenticateOrThrow(ctx: Context): Promise<Client>;
}

export const ClientAuthenticator =
  createToken<ClientAuthenticator>('ClientAuthenticator');

export type ClientAuthenticationResult =
  FailedClientAuthenticationResult | SuccessfulClientAuthenticationResult;

export interface FailedClientAuthenticationResult {
  type: 'FAILED';
  error: Error;
}

export interface SuccessfulClientAuthenticationResult {
  type: 'SUCCESSFUL';
  client: Client;
}

@injectableConstructor({
  clientService: ClientService
})
@singleton()
export class ClientAuthenticatorImpl implements ClientAuthenticator {
  private readonly _clientService: ClientService;

  public constructor(deps: {
    clientService: ClientService;
  }) {
    ({
      clientService: this._clientService
    } = deps);
  }

  public async authenticate(ctx: Context): Promise<ClientAuthenticationResult> {
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
        type: 'FAILED',
        error: new InvalidAuthorizationHeaderError()
      };
    }

    const client = await this._clientService.findByCredentials({
      publicId,
      secret
    });
    if (client === null) {
      return {
        type: 'FAILED',
        error: new InvalidClientCredentialError()
      };
    }

    return {
      type: 'SUCCESSFUL',
      client
    };
  }

  public async authenticateOrThrow(ctx: Context): Promise<Client> {
    const result = await this.authenticate(ctx);
    if (result.type === 'FAILED') {
      Error.captureStackTrace(result.error, this.authenticateOrThrow);
      throw result.error;
    }
    return result.client;
  }
}


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
  if (result.type === 'FAILED') {
    Error.captureStackTrace(result.error, getAuthenticatedClient);
    throw result.error;
  }
  return result.client;
};


type AuthenticateClientInitializerArgs = [ClientAuthenticator];

const authenticateClientName = 'authenticateClient';
const authenticateClientInitializersSym = Symbol('authenticateClientInitializers');

export const authenticateClient =
  (options?: { noThrow?: boolean }): MethodDecorator => {
    const noThrow = options?.noThrow ?? false;

    return wrapMethodFactory<AuthenticateClientInitializerArgs>(
      authenticateClientName,
      authenticateClientInitializersSym,
      (method) => ($this, authenticator) => {
        const authenticateClientHandler: Middleware = async function(this: object, ctx, next) {
          const result = await authenticator.authenticate(ctx);
          setClientAuthenticationResult(ctx, result);
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

export const initializeAuthenticateClient =
  createMethodInitializer<AuthenticateClientInitializerArgs>(
    authenticateClientName,
    authenticateClientInitializersSym
  );
