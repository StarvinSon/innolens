import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/lib-node';
import { ObjectId, Collection, Long } from 'mongodb';

import { Db } from './db';


export interface MachineMemberRecord {
  readonly _id: ObjectId;
  readonly typeId: string;
  readonly instanceId: string;
  readonly time: Date;
  readonly action: 'acquire' | 'release';
  readonly actionMemberId: string;
  readonly memberIds: ReadonlyArray<string>;
  readonly versionId: Long;
}


export interface MachineMemberRecordCollection extends Collection<MachineMemberRecord> {}

export const MachineMemberRecordCollection = decorate(
  name('MachineMemberRecordCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<MachineMemberRecordCollection> =>
    db.defineCollection('machineMemberRecords', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            '_id',
            'typeId',
            'instanceId',
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
            typeId: {
              bsonType: 'string'
            },
            instanceId: {
              bsonType: 'string'
            },
            time: {
              bsonType: 'date'
            },
            action: {
              enum: ['acquire', 'release']
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
            typeId: 1,
            instanceId: 1,
            time: 1,
            versionId: 1
          },
          unique: true
        }
      ]
    })
);
