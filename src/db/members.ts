import { Db, ObjectId } from 'mongodb';
import { Logger } from 'winston';

import { createCollection } from './common';


export interface Member {
  readonly _id: ObjectId;
  readonly groupName: string;
}


export interface MembersCollectionOptions {
  readonly logger: Logger;
  readonly db: Db;
}

export const createMembersCollection = async (options: MembersCollectionOptions) => {
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
