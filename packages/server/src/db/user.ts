import { ObjectId, Collection } from 'mongodb';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';

import { Db } from './db';


export interface User {
  readonly _id: ObjectId;
  readonly username: string;
  readonly passwordHash: string;
  readonly name: string;
}


export interface UserCollection extends Collection<User> {}

export const UserCollection = createToken<Promise<UserCollection>>(module, 'UserCollection');

export const createUserCollection: DependencyCreator<Promise<UserCollection>> = async (appCtx) => {
  const db = await appCtx.resolve(Db);

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

// eslint-disable-next-line max-len
export const registerUserCollection = createSingletonDependencyRegistrant(UserCollection, createUserCollection);
