import { UNAUTHORIZED } from 'http-status-codes';
import { Context as KoaContext } from 'koa';

import { DependencyCreator } from '../../app-context';
import { Client, ClientService } from '../../services/client';
import { OAuth2Service, OAuth2Token } from '../../services/oauth2';
import { User, UserService } from '../../services/user';
import { createError } from '../../utils/error';


export interface UserAuthenticator {
  (ctx: KoaContext): Promise<UserAuthenticatorResult>;
}

export interface UserAuthenticatorResult {
  oauth2Token: OAuth2Token;
  getClient(): Promise<Client>;
  getUser(): Promise<User>;
}

// eslint-disable-next-line max-len
export const createUserAuthenticator: DependencyCreator<Promise<UserAuthenticator>> = async (appCtx) => {
  const [
    clientService,
    userService,
    oauth2Service
  ] = await appCtx.resolveAllAsync(
    ClientService,
    UserService,
    OAuth2Service
  );

  const authenticateUser: UserAuthenticator = async (ctx) => {
    const auth = ctx.get('Authorization');

    if (auth === undefined || !auth.startsWith('Bearer ')) {
      throw createError({
        statusCode: UNAUTHORIZED,
        headers: { 'WWW-Authenticate': 'Bearer' },
        description: 'Missing access token or access token format not correct'
      });
    }
    const accessToken = auth.slice('Bearer '.length);

    const oauth2Token = await oauth2Service.findByAccessToken(accessToken);
    if (oauth2Token === null) {
      throw createError({
        statusCode: UNAUTHORIZED,
        headers: { 'WWW-Authenticate': 'Bearer' },
        description: 'Invalid access token'
      });
    }

    return {
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

  return authenticateUser;
};
