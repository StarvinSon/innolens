import { randomBytes } from 'crypto';
import { promisify } from 'util';

import { ObjectId } from 'mongodb';

import { OAuth2Token, OAuth2Collection } from '../db/oauth2';
import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';


const randomBytesAsync = promisify(randomBytes);


export { OAuth2Token };

export interface OAuth2Service {
  verifyScopes(scopes: ReadonlyArray<string>): boolean;
  isScopeFullfilled(grantScopes: ReadonlyArray<string>, requiredScope: string): boolean;
  findByRefreshToken(refreshToken: string, date: Date): Promise<OAuth2Token | null>;
  revokeByRefreshToken(refreshToken: string, date: Date): Promise<boolean>;
  createAccessToken(tokenOptions: CreateAccessTokenOptions): Promise<OAuth2Token>;
}

export const OAuth2Service = createToken<Promise<OAuth2Service>>(module, 'OAuth2Service');

export interface CreateAccessTokenOptions {
  readonly clientId: ObjectId;
  readonly userId: ObjectId;
  readonly scopes: ReadonlyArray<string>;
}

export const createOAuth2Service: DependencyCreator<Promise<OAuth2Service>> = async (appCtx) => {
  const oauth2Collection = await appCtx.resolve(OAuth2Collection);

  const validScopes = new Set([
    '*'
  ]);

  const generateToken = async (): Promise<string> => (await randomBytesAsync(16)).toString('hex');

  const verifyScopes: OAuth2Service['verifyScopes'] = (scopes) =>
    scopes.every((s) => validScopes.has(s));

  const isScopeFullfilled: OAuth2Service['isScopeFullfilled'] = (grantScopes, requiredScope) =>
    grantScopes.some((s) => s === '*' || s === requiredScope);

  const findByRefreshToken: OAuth2Service['findByRefreshToken'] = async (refreshToken, date) =>
    oauth2Collection.tokens.findOne({
      refreshToken,
      refreshTokenExpireDate: { $gt: date },
      revoked: false
    });

  const revokeByRefreshToken: OAuth2Service['revokeByRefreshToken'] = async (refreshToken, date) => {
    const result = await oauth2Collection.tokens.updateOne({
      refreshToken,
      refreshTokenExpireDate: { $gt: date },
      revoked: false
    }, {
      $set: {
        revoked: true
      }
    });
    return result.modifiedCount > 0;
  };

  const createAccessToken: OAuth2Service['createAccessToken'] = async (tokenOptions) => {
    const { clientId, userId, scopes } = tokenOptions;

    const [accessToken, refreshToken] = await Promise.all([generateToken(), generateToken()]);

    const issueDate = new Date();
    const accessTokenExpireDate = new Date(issueDate);
    accessTokenExpireDate.setHours(accessTokenExpireDate.getHours() + 1);
    const refreshTokenExpireDate = new Date(issueDate);
    refreshTokenExpireDate.setDate(refreshTokenExpireDate.getDate() + 1);

    const token: OAuth2Token = {
      _id: new ObjectId(),
      userId,
      clientId,
      issueDate,
      accessToken,
      accessTokenExpireDate,
      refreshToken,
      refreshTokenExpireDate,
      scopes,
      revoked: false
    };

    await oauth2Collection.tokens.insertOne(token);
    return token;
  };

  return {
    verifyScopes,
    isScopeFullfilled,
    findByRefreshToken,
    revokeByRefreshToken,
    createAccessToken
  };
};

// eslint-disable-next-line max-len
export const registerOAuth2Service = createSingletonDependencyRegistrant(OAuth2Service, createOAuth2Service);
