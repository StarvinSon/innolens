import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/lib-node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface OAuth2Token {
  readonly _id: ObjectId;
  readonly userId: ObjectId;
  readonly clientId: ObjectId;
  readonly issueDate: Date;
  readonly accessToken: string;
  readonly accessTokenExpireDate: Date;
  readonly refreshToken: string | null;
  readonly refreshTokenExpireDate: Date | null;
  readonly scopes: ReadonlyArray<string>;
  readonly revoked: boolean;
}


export interface OAuth2Collection {
  readonly tokens: Collection<OAuth2Token>;
}

export const OAuth2Collection = decorate(
  name('OAuth2Collection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<OAuth2Collection> => {
    const tokenColl = await db.defineCollection<OAuth2Token>('oauth2.tokens', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            '_id',
            'userId',
            'clientId',
            'issueDate',
            'accessToken',
            'accessTokenExpireDate',
            'refreshToken',
            'refreshTokenExpireDate',
            'scopes',
            'revoked'
          ],
          additionalProperties: false,
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            userId: {
              bsonType: 'objectId'
            },
            clientId: {
              bsonType: 'objectId'
            },
            issueDate: {
              bsonType: 'date'
            },
            accessToken: {
              bsonType: 'string'
            },
            accessTokenExpireDate: {
              bsonType: 'date'
            },
            refreshToken: {
              oneOf: [{
                bsonType: 'string'
              }, {
                bsonType: 'null'
              }]
            },
            refreshTokenExpireDate: {
              oneOf: [{
                bsonType: 'date'
              }, {
                bsonType: 'null'
              }]
            },
            scopes: {
              bsonType: 'array',
              items: {
                bsonType: 'string'
              }
            },
            revoked: {
              bsonType: 'bool'
            }
          }
        }
      },

      indexes: [
        {
          key: { accessToken: 1 },
          unique: true
        },
        {
          key: { refreshToken: 1 },
          unique: true
        }
      ]
    });

    return { tokens: tokenColl };
  }
);
