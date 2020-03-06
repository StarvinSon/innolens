import {
  createToken, decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface ExpendableInventoryStockRecord {
  readonly _id: ObjectId;
  readonly quantity: number;
  readonly date: Date;
  readonly inventoryId: string;
}


export interface ExpendableInventoryStockRecordCollection extends Collection<ExpendableInventoryStockRecord> {}

export const ExpendableInventoryStockRecordCollection =
  createToken<ExpendableInventoryStockRecordCollection>('ExpendableInventoryStockRecordCollection');


export const createExpendableInventoryStockRecordCollection = decorate(
  name('createExpendableInventoryStockRecordCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<ExpendableInventoryStockRecordCollection> =>
    db.defineCollection('expendableInventoryStockRecords', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          additionalProperties: false,
          required: [
            '_id',
            'quantity',
            'date',
            'inventoryId'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            quantity: {
              bsonType: 'double'
            },
            date: {
              bsonType: 'date'
            },
            inventoryId: {
              bsonType: 'string'
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