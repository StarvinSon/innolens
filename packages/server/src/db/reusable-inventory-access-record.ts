import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface ReusableInventoryAccessRecord {
  readonly _id: ObjectId;
  readonly typeId: string;
  readonly instanceId: string;
  readonly memberId: string;
  readonly time: Date;
  readonly action: 'acquire' | 'release';
}


// eslint-disable-next-line max-len
export interface ReusableInventoryAccessRecordCollection extends Collection<ReusableInventoryAccessRecord> {}

export const ReusableInventoryAccessRecordCollection = decorate(
  name('ReusableInventoryAccessRecordCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<ReusableInventoryAccessRecordCollection> =>
    db.defineCollection('ReusableInventoryAccessRecords', {
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
            'memberId',
            'time',
            'action'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            typeId: {
              bsonType: 'string'
            },
            memberId: {
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
            }
          }
        }
      },
      indexes: [
        {
          key: { typeId: 1, instanceId: 1, time: 1 }
        }
      ]
    })
);
