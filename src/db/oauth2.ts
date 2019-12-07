import { ObjectId, Collection } from 'mongodb';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';

import { createCollection } from './db';


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

export const OAuth2Collection = createToken<Promise<OAuth2Collection>>(module, 'OAuth2Collection');

// eslint-disable-next-line max-len
export const createOAuth2Collection: DependencyCreator<Promise<OAuth2Collection>> = async (appCtx) => {
  const tokensColl = await createCollection<OAuth2Token>(appCtx, 'oauth2.tokens', {
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
      [{ accessToken: 1 }, { unique: true }],
      [{ refreshToken: 1 }, { unique: true }]
    ]
  });

  return { tokens: tokensColl };
};

// eslint-disable-next-line max-len
export const registerOAuth2Collection = createSingletonDependencyRegistrant(OAuth2Collection, createOAuth2Collection);
