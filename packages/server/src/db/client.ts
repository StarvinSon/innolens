import { ObjectId, Collection } from 'mongodb';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';

import { Db } from './db';


export interface Client {
  readonly _id: ObjectId;
  readonly publicId: string;
  readonly type: ClientType;
  readonly secretHash: string;
  readonly name: string;
}

export enum ClientType {
  PUBLIC = 'PUBLIC',
  CONFIDENTIAL = 'CONFIDENTIAL'
}


export interface ClientCollection extends Collection<Client> {}

export const ClientCollection = createToken<Promise<ClientCollection>>(module, 'ClientCollection');

// eslint-disable-next-line max-len
export const createClientCollection: DependencyCreator<Promise<ClientCollection>> = async (appCtx) => {
  const db = await appCtx.resolve(Db);

  return db.defineCollection('clients', {
    validationLevel: 'strict',
    validationAction: 'error',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          '_id',
          'publicId',
          'type',
          'secretHash',
          'name'
        ],
        additionalProperties: false,
        properties: {
          _id: {
            bsonType: 'objectId'
          },
          publicId: {
            bsonType: 'string'
          },
          type: {
            enum: [ClientType.PUBLIC, ClientType.CONFIDENTIAL]
          },
          secretHash: {
            bsonType: 'string'
          },
          name: {
            bsonType: 'string'
          }
        }
      }
    },

    indexes: [
      {
        key: { publicId: 1 },
        unique: true
      }
    ]
  });
};

// eslint-disable-next-line max-len
export const registerClientCollection = createSingletonDependencyRegistrant(ClientCollection, createClientCollection);
