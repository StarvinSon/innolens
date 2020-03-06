import {
  createToken, decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface ReusableInventoryUsage {
  _id: ObjectId;
  memberId: string;
  reusableInventoryId: string;
  startTime: Date;
  endTime: Date;
}


export interface ReusableInventoryUsageCollection extends Collection<ReusableInventoryUsage> {}

export const ReusableInventoryUsageCollection =
  createToken<ReusableInventoryUsageCollection>('ReusableInventoryUsageCollection');


export const createReusableInventoryUsageCollection = decorate(
  name('createReusableInventoryUsageCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<ReusableInventoryUsageCollection> =>
    db.defineCollection('reusableInventoryUsage', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          additionalProperties: false,
          required: [
            '_id',
            'memberId',
            'reusableInventoryId',
            'startTime',
            'endTime'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            memberId: {
              bsonType: 'string'
            },
            reusableInventoryId: {
              bsonType: 'string'
            },
            startTime: {
              bsonType: 'date'
            },
            endTime: {
              bsonType: 'date'
            }
          }
        }
      },
      indexes: [
        {
          key: { reusableInventoryId: 1 }
        }
      ]
    })
);
