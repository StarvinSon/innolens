import {
  createToken, decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface User {
  readonly _id: ObjectId;
  readonly username: string;
  readonly passwordHash: string;
  readonly name: string;
}


export interface UserCollection extends Collection<User> {}

export const UserCollection = createToken<UserCollection>('UserCollection');


export const createUserCollection = decorate(
  name('createUserCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<UserCollection> =>
    db.defineCollection('users', {
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
    })
);
