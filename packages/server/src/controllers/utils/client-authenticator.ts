import { UNAUTHORIZED } from 'http-status-codes';

import { createToken, createAsyncSingletonRegistrant } from '../../resolver';
import { Client, ClientService } from '../../services/client';
import { Context } from '../context';


export class ClientAuthenticationFailedError extends Error {
  public readonly code = 'ERR_CLIENT_AUTHENTICATION_FAILED';
  public readonly statusCode = UNAUTHORIZED;
  public readonly headers: Readonly<Record<string, string>> = { 'WWW-Authenticate': 'Basic' };
  public constructor() {
    super('Failed to authenticate client');
  }
}


export interface ClientAuthenticator {
  (ctx: Context): Promise<Client>;
}


export const createClientAuthenticator = (options: {
  clientService: ClientService;
}): ClientAuthenticator => {
  const { clientService } = options;

  const authenticateClient: ClientAuthenticator = async (ctx) => {
    const auth = ctx.get('Authorization');

    const parts = auth === undefined || !auth.startsWith('Basic ')
      ? null
      : Buffer
        .from(auth.slice('Basic '.length), 'base64')
        .toString()
        .split(':', 2);

    const client = parts !== null && parts.length === 2
      ? await clientService.findByCredentials({
        publicId: parts[0],
        secret: parts[1]
      })
      : null;

    if (client === null) {
      throw new ClientAuthenticationFailedError();
    }

    return client;
  };

  return authenticateClient;
};


export const ClientAuthenticator =
  createToken<Promise<ClientAuthenticator>>(__filename, 'ClientAuthenticator');

export const registerClientAuthenticator = createAsyncSingletonRegistrant(
  ClientAuthenticator,
  { clientService: ClientService },
  createClientAuthenticator
);
