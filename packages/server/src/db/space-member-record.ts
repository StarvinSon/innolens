import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface SpaceMemberRecord {
  readonly _id: ObjectId;
  readonly spaceId: string;
  readonly time: Date;
  readonly memberIds: ReadonlyArray<string>;
  readonly mode: 'access' | 'set';
}


export interface SpaceMemberRecordCollection extends Collection<SpaceMemberRecord> {}

export const SpaceMemberRecordCollection = decorate(
  name('SpaceMemberRecordCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<SpaceMemberRecordCollection> =>
    db.defineCollection('spaceMemberRecords', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            '_id',
            'spaceId',
            'time',
            'memberIds',
            'mode'
          ],
          additionalProperties: false,
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            spaceId: {
              bsonType: 'string'
            },
            time: {
              bsonType: 'date'
            },
            memberIds: {
              bsonType: 'array',
              items: {
                type: 'string'
              }
            },
            mode: {
              enum: ['access', 'set']
            }
          }
        }
      },
      indexes: [
        {
          key: { spaceId: 1, time: 1, _id: 1 }
        }
      ]
    })
);
