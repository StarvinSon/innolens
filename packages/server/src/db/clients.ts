import { ObjectId, Collection } from 'mongodb';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';

import { createCollection } from './db';


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


export type ClientsCollection = Collection<Client>;

export const ClientsCollection = createToken<Promise<ClientsCollection>>(module, 'ClientsCollection');

// eslint-disable-next-line max-len
export const createClientsCollection: DependencyCreator<Promise<ClientsCollection>> = async (appCtx) =>
  createCollection<Client>(appCtx, 'clients', {
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
      [{ publicId: 1 }, { unique: true }]
    ]
  });

// eslint-disable-next-line max-len
export const registerClientsCollection = createSingletonDependencyRegistrant(ClientsCollection, createClientsCollection);
