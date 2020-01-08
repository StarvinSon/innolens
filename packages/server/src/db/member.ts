import { ObjectId, Collection } from 'mongodb';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';

import { Db } from './db';


export interface Member {
  readonly _id: ObjectId;
  readonly groupName: string;
}

export interface MemberCollection extends Collection<Member> {}


export const createMemberCollection = async (options: {
  db: Db;
}): Promise<MemberCollection> => {
  const { db } = options;

  return db.defineCollection('members', {
    validationLevel: 'strict',
    validationAction: 'error',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['_id', 'groupName'],
        additionalProperties: false,
        properties: {
          _id: {
            bsonType: 'objectId'
          },
          groupName: {
            bsonType: 'string'
          }
        }
      }
    }
  });
};


export const MemberCollection =
  createToken<Promise<MemberCollection>>(__filename, 'MemberCollection');

export const registerMemberCollection = createAsyncSingletonRegistrant(
  MemberCollection,
  { db: Db },
  createMemberCollection
);
