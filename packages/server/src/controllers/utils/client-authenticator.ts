import { UNAUTHORIZED } from 'http-status-codes';
import { Context as KoaContext } from 'koa';

import { DependencyCreator } from '../../app-context';
import { Client, ClientService } from '../../services/client';
import { createError } from '../../utils/error';


export const ERR_CLIENT_AUTHENTICATION_FAILED = 'Client authentication failed';


export interface ClientAuthenticator {
  (ctx: KoaContext): Promise<Client>;
}

// eslint-disable-next-line max-len
export const createClientAuthenticator: DependencyCreator<Promise<ClientAuthenticator>> = async (appCtx) => {
  const clientService = await appCtx.resolve(ClientService);

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
      throw createError({
        statusCode: UNAUTHORIZED,
        headers: { 'WWW-Authenticate': 'Basic' },
        errorCode: ERR_CLIENT_AUTHENTICATION_FAILED,
        description: 'Failed to authenticate client'
      });
    }

    return client;
  };

  return authenticateClient;
};
