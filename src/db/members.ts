import { ObjectId, Collection } from 'mongodb';

import { createCollection, CommonCollectionOptions } from './common';


export interface Member {
  readonly _id: ObjectId;
  readonly groupName: string;
}


export const createMembersCollection = async (
  options: CommonCollectionOptions
): Promise<Collection<Member>> => {
  const { logger, db } = options;

  return createCollection<Member>(db, 'members', {
    logger,
    validationLevel: 'strict',
    validationAction: 'error',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['_id', 'groupName'],
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
