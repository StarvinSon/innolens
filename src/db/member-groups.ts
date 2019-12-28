import { ObjectId, Collection } from 'mongodb';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';

import { createCollection } from './db';


export interface MemberGroup {
  _id: ObjectId;
  // Multiple group will be created after each analysis and they share the same batch id
  batchId: ObjectId;
  name: string;
  count: number;
}

export interface MemberGroupsCollection extends Collection<MemberGroup> {}

export const MemberGroupsCollection = createToken<Promise<MemberGroupsCollection>>(module, 'MemberGroupsCollection');

// eslint-disable-next-line max-len
export const createMemberGroupsCollection: DependencyCreator<Promise<MemberGroupsCollection>> = async (appCtx) =>
  createCollection(appCtx, 'memberGroups', {
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
      [{ batchId: 1 }]
    ]
  });

// eslint-disable-next-line max-len
export const registerMemberGroupsCollection = createSingletonDependencyRegistrant(MemberGroupsCollection, createMemberGroupsCollection);
