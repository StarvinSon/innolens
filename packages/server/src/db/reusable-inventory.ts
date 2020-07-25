import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/lib-node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface ReusableInventory {
  readonly _id: ObjectId;
  readonly inventoryId: string;
  readonly reusableInventoryItemId: string;
  readonly status: string;
}


export interface ReusableInventoryCollection extends Collection<ReusableInventory> {}

export const ReusableInventoryCollection = decorate(
  name('ReusableInventoryCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<ReusableInventoryCollection> =>
    db.defineCollection('reusableInventories', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          additionalProperties: false,
          required: [
            '_id',
            'inventoryId',
            'reusableInventoryItemId',
            'status'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            inventoryId: {
              bsonType: 'string'
            },
            reusableInventoryItemId: {
              bsonType: 'string'
            },
            status: {
              bsonType: 'string'
            }
          }
        }
      },
      indexes: [
        {
          key: { reusableInventoryItemId: 1 },
          unique: true
        }
      ]
    })
);
