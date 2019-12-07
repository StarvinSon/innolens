import { ObjectId, Collection } from 'mongodb';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';

import { createCollection } from './db';


export interface User {
  readonly _id: ObjectId;
  readonly username: string;
  readonly passwordHash: string;
  readonly name: string;
}


export type UsersCollection = Collection<User>;

export const UsersCollection = createToken<Promise<UsersCollection>>(module, 'UsersCollection');

export const createUsersCollection: DependencyCreator<Promise<UsersCollection>> = async (appCtx) =>
  createCollection<User>(appCtx, 'users', {
    validationLevel: 'strict',
    validationAction: 'error',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['_id', 'username', 'passwordHash', 'name'],
        additionalProperties: false,
        properties: {
          _id: {
            bsonType: 'objectId'
          },
          username: {
            bsonType: 'string'
          },
          passwordHash: {
            bsonType: 'string'
          },
          name: {
            bsonType: 'string'
          }
        }
      }
    },

    indexes: [
      [{ username: 1 }, { unique: true }]
    ]
  });

// eslint-disable-next-line max-len
export const registerUsersCollection = createSingletonDependencyRegistrant(UsersCollection, createUsersCollection);
