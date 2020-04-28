import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface ReusableInventoryMemberRecord {
  readonly _id: ObjectId;
  readonly typeId: string;
  readonly instanceId: string;
  readonly time: Date;
  readonly action: 'acquire' | 'release';
  readonly actionMemberId: string;
  readonly memberIds: ReadonlyArray<string>;
}


// eslint-disable-next-line max-len
export interface ReusableInventoryMemberRecordCollection extends Collection<ReusableInventoryMemberRecord> {}

export const ReusableInventoryMemberRecordCollection = decorate(
  name('ReusableInventoryMemberRecordCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<ReusableInventoryMemberRecordCollection> =>
    db.defineCollection('reusableInventoryMemberRecords', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          additionalProperties: false,
          required: [
            '_id',
            'typeId',
            'instanceId',
            'time',
            'action',
            'actionMemberId',
            'memberIds'
          ],
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
            }
          }
        }
      },
      indexes: [
        {
          key: {
            time: 1,
            _id: 1
          }
        },
        {
          key: {
            typeId: 1,
            instanceId: 1,
            time: 1,
            _id: 1
          }
        }
      ]
    })
);
