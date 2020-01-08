import { ObjectId, Collection } from 'mongodb';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';

import { Db } from './db';


export interface MemberGroup {
  _id: ObjectId;
  // Multiple group will be created after each analysis and they share the same batch id
  batchId: ObjectId;
  name: string;
  count: number;
}

export interface MemberGroupCollection extends Collection<MemberGroup> {}


export const createMemberGroupCollection = async (options: {
  db: Db;
}): Promise<MemberGroupCollection> => {
  const { db } = options;

  return db.defineCollection('memberGroups', {
    validationLevel: 'strict',
    validationAction: 'error',
    validator: {
      $jsonSchema: {
        bsonType: 'objectId',
        required: ['_id', 'batchId', 'name', 'count'],
        additionalProperties: false,
        properties: {
          _id: {
            bsonType: 'objectId'
          },
          batchId: {
            bsonType: 'objectId'
          },
          name: {
            bsonType: 'string'
          },
          count: {
            bsonType: 'int'
          }
        }
      }
    },
    indexes: [
      { key: { batchId: 1 } }
    ]
  });
};


export const MemberGroupCollection =
  createToken<Promise<MemberGroupCollection>>(__filename, 'MemberGroupCollection');

export const registerMemberGroupCollection = createAsyncSingletonRegistrant(
  MemberGroupCollection,
  { db: Db },
  createMemberGroupCollection
);
