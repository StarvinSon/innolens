import { ObjectId, Collection } from 'mongodb';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';

import { Db } from './db';


export interface User {
  readonly _id: ObjectId;
  readonly username: string;
  readonly passwordHash: string;
  readonly name: string;
}

export interface UserCollection extends Collection<User> {}


export const createUserCollection = async (options: {
  db: Db;
}): Promise<UserCollection> => {
  const { db } = options;

  return db.defineCollection('users', {
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
      {
        key: { username: 1 },
        unique: true
      }
    ]
  });
};


export const UserCollection =
  createToken<Promise<UserCollection>>(__filename, 'UserCollection');

export const registerUserCollection = createAsyncSingletonRegistrant(
  UserCollection,
  { db: Db },
  createUserCollection
);
