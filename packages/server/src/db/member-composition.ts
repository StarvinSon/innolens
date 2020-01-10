import { ObjectId, Collection } from 'mongodb';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';

import { Db } from './db';


export interface MemberComposition {
  readonly _id: ObjectId;
  readonly time: Date;
  readonly perspectives: ReadonlyArray<MemberCompositionPerspective>;
}

export interface MemberCompositionPerspective {
  readonly type: string;
  readonly groups: ReadonlyArray<MemberCompositionGroup>;
}

export interface MemberCompositionGroup {
  readonly type: string;
  readonly count: number;
}


export interface MemberCompositionCollection extends Collection<MemberComposition> {}


export const createMemberCompositionCollection = async (options: {
  db: Db;
}): Promise<MemberCompositionCollection> => {
  const { db } = options;

  return db.defineCollection('memberCompositions', {
    validationLevel: 'strict',
    validationAction: 'error',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          '_id',
          'time',
          'perspectives'
        ],
        additionalProperties: false,
        properties: {
          _id: {
            bsonType: 'objectId'
          },
          time: {
            bsonType: 'date'
          },
          perspectives: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              additionalProperties: false,
              required: [
                'type',
                'groups'
              ],
              properties: {
                type: {
                  bsonType: 'string'
                },
                groups: {
                  bsonType: 'array',
                  items: {
                    bsonType: 'object',
                    additionalProperties: false,
                    required: [
                      'type',
                      'count'
                    ],
                    properties: {
                      type: {
                        bsonType: 'string'
                      },
                      count: {
                        bsonType: 'int'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    indexes: [
      { key: { time: 1 } }
    ]
  });
};


export const MemberCompositionCollection =
  createToken<Promise<MemberCompositionCollection>>(__filename, 'MemberCompositionCollection');

export const registerMemberCompositionCollection = createAsyncSingletonRegistrant(
  MemberCompositionCollection,
  { db: Db },
  createMemberCompositionCollection
);
