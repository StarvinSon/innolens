import {
  createToken, decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface Inventory {
  readonly _id: ObjectId;
  readonly inventoryId: string;
  readonly inventoryName: string;
  readonly isReusable: boolean;
  readonly type: string;
  readonly inventories: Array<{
    reusableInventoryId: string;
    status: string;
  }>;
}


export interface InventoryCollection extends Collection<Inventory> {}

export const InventoryCollection =
  createToken<InventoryCollection>('InventoryCollection');


export const createInventoryCollection = decorate(
  name('createInventoryCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<InventoryCollection> =>
    db.defineCollection('inventories', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          additionalProperties: false,
          required: [
            '_id',
            'inventoryId',
            'inventoryName',
            'isReusable',
            'type',
            'inventories'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            inventoryId: {
              bsonType: 'string'
            },
            inventoryName: {
              bsonType: 'string'
            },
            isReusable: {
              bsonType: 'bool'
            },
            type: {
              bsonType: 'string'
            },
            inventories: {
              bsonType: 'array'
            }
          }
        }
      },
      indexes: [
        {
          key: { inventoryId: 1 },
          unique: true
        }
      ]
    })
);
