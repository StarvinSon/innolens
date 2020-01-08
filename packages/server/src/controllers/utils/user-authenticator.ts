import { UNAUTHORIZED } from 'http-status-codes';

import { createToken, createAsyncSingletonRegistrant } from '../../resolver';
import { Client, ClientService } from '../../services/client';
import { OAuth2Service, OAuth2Token } from '../../services/oauth2';
import { User, UserService } from '../../services/user';
import { Context } from '../context';

import { Headers } from './headers';


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
  (ctx: Context): Promise<UserAuthenticatorResult>;
}

export interface UserAuthenticatorResult {
  oauth2Token: OAuth2Token;
  getClient(): Promise<Client>;
  getUser(): Promise<User>;
}


export const createUserAuthenticator = (options: {
  clientService: ClientService;
  userService: UserService;
  oauth2Service: OAuth2Service;
}): UserAuthenticator => {
  const {
    clientService,
    userService,
    oauth2Service
  } = options;

  const authenticate: UserAuthenticator = async (ctx) => {
    const auth = ctx.get('Authorization');

    if (auth === undefined || !auth.startsWith('Bearer ')) {
      throw new MissingAccessTokenError();
    }
    const accessToken = auth.slice('Bearer '.length);

    const oauth2Token = await oauth2Service.findByAccessToken(accessToken);
    if (oauth2Token === null) {
      throw new InvalidAccessTokenError();
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

  return authenticate;
};


export const UserAuthenticator =
  createToken<Promise<UserAuthenticator>>(__filename, 'UserAuthenticator');

export const registerUserAuthenticator = createAsyncSingletonRegistrant(
  UserAuthenticator,
  {
    clientService: ClientService,
    userService: UserService,
    oauth2Service: OAuth2Service
  },
  createUserAuthenticator
);
