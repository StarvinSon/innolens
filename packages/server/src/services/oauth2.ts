import { randomBytes } from 'crypto';
import { promisify } from 'util';

import { singleton, injectableConstructor } from '@innolens/resolver';
import { ObjectId } from 'mongodb';

import { OAuth2Token, OAuth2Collection } from '../db/oauth2';


const randomBytesAsync = promisify(randomBytes);


export { OAuth2Token };

export interface CreateAccessTokenOptions {
  readonly clientId: ObjectId;
  readonly userId: ObjectId;
  readonly scopes: ReadonlyArray<string>;
}


const validScopes = new Set([
  '*'
]);

const generateToken = async (): Promise<string> => (await randomBytesAsync(16)).toString('hex');

@injectableConstructor({
  oauth2Collection: OAuth2Collection
})
@singleton()
export class OAuth2Service {
  private readonly _oauth2Collection: OAuth2Collection;

  public constructor(options: {
    oauth2Collection: OAuth2Collection;
  }) {
    ({
      oauth2Collection: this._oauth2Collection
    } = options);
  }

  public async findByAccessToken(
    accessToken: string,
    currDate = new Date()
  ): Promise<OAuth2Token | null> {
    return this._oauth2Collection.tokens.findOne({
      accessToken,
      accessTokenExpireDate: { $gt: currDate },
      revoked: false
    });
  }

  public verifyScopes(scopes: ReadonlyArray<string>): boolean {
    return scopes.every((s) => validScopes.has(s));
  }

  public isScopeFullfilled(grantScopes: ReadonlyArray<string>, requiredScope: string): boolean {
    return grantScopes.some((s) => s === '*' || s === requiredScope);
  }

  public async findByRefreshToken(refreshToken: string, time: Date): Promise<OAuth2Token | null> {
    return this._oauth2Collection.tokens.findOne({
      refreshToken,
      refreshTokenExpireDate: { $gt: time },
      revoked: false
    });
  }

  public async revokeByRefreshToken(refreshToken: string, time: Date): Promise<boolean> {
    const result = await this._oauth2Collection.tokens.updateOne({
      refreshToken,
      refreshTokenExpireDate: { $gt: time },
      revoked: false
    }, {
      $set: {
        revoked: true
      }
    });
    return result.modifiedCount > 0;
  }

  public async createAccessToken(tokenOptions: CreateAccessTokenOptions): Promise<OAuth2Token> {
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

    await this._oauth2Collection.tokens.insertOne(token);
    return token;
  }
}
