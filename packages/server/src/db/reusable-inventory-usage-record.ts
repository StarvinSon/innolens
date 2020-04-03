import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface ReusableInventoryUsageRecord {
  _id: ObjectId;
  memberId: string;
  reusableInventoryItemId: string;
  time: Date;
  action: string;
}


export interface ReusableInventoryUsageRecordCollection
  extends Collection<ReusableInventoryUsageRecord> {}

export const ReusableInventoryUsageRecordCollection = decorate(
  name('ReusableInventoryUsageRecordCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<ReusableInventoryUsageRecordCollection> =>
    db.defineCollection('reusableInventoryUsageRecords', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          additionalProperties: false,
          required: [
            '_id',
            'memberId',
            'reusableInventoryItemId',
            'time',
            'action'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            memberId: {
              bsonType: 'string'
            },
            reusableInventoryItemId: {
              bsonType: 'string'
            },
            time: {
              bsonType: 'date'
            },
            action: {
              bsonType: 'string'
            }
          }
        }
      },
      indexes: [
        {
          key: { reusableInventoryItemId: 1 }
        }
      ]
    })
);
