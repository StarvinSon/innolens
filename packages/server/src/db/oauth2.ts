import { ObjectId, Collection } from 'mongodb';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';

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


export const createOAuth2Collection = async (options: {
  db: Db;
}): Promise<OAuth2Collection> => {
  const { db } = options;

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
};


export const OAuth2Collection =
  createToken<Promise<OAuth2Collection>>(__filename, 'OAuth2Collection');

export const registerOAuth2Collection = createAsyncSingletonRegistrant(
  OAuth2Collection,
  { db: Db },
  createOAuth2Collection
);
