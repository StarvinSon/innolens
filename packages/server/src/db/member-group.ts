import { ObjectId, Collection } from 'mongodb';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';

import { Db } from './db';


export interface MemberGroup {
  _id: ObjectId;
  // Multiple group will be created after each analysis and they share the same batch id
  batchId: ObjectId;
  name: string;
  count: number;
}

export interface MemberGroupCollection extends Collection<MemberGroup> {}

export const MemberGroupCollection = createToken<Promise<MemberGroupCollection>>(module, 'MemberGroupCollection');

// eslint-disable-next-line max-len
export const createMemberGroupCollection: DependencyCreator<Promise<MemberGroupCollection>> = async (appCtx) => {
  const db = await appCtx.resolve(Db);
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

// eslint-disable-next-line max-len
export const registerMemberGroupCollection = createSingletonDependencyRegistrant(MemberGroupCollection, createMemberGroupCollection);
