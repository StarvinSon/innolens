import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/lib-node';
import { ObjectId, Collection, Long } from 'mongodb';

import { Db } from './db';


export interface SpaceMemberRecord {
  readonly _id: ObjectId;
  readonly spaceId: string;
  readonly time: Date;
  readonly action: 'enter' | 'exit';
  readonly actionMemberId: string;
  readonly memberIds: ReadonlyArray<string>;
  readonly versionId: Long;
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
            'action',
            'actionMemberId',
            'memberIds',
            'versionId'
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
            action: {
              enum: ['enter', 'exit']
            },
            actionMemberId: {
              bsonType: 'string'
            },
            memberIds: {
              bsonType: 'array',
              items: {
                type: 'string'
              }
            },
            versionId: {
              bsonType: 'long'
            }
          }
        }
      },
      indexes: [
        {
          key: {
            time: 1,
            versionId: 1
          }
        },
        {
          key: {
            spaceId: 1,
            time: 1,
            versionId: 1
          },
          unique: true
        }
      ]
    })
);
