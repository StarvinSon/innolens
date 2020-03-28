import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface ExpendableInventoryStockRecord {
  readonly _id: ObjectId;
  readonly inventoryId: string;
  readonly time: Date;
  readonly quantity: number;
}


export interface ExpendableInventoryStockRecordCollection
  extends Collection<ExpendableInventoryStockRecord> {}

export const ExpendableInventoryStockRecordCollection = decorate(
  name('ExpendableInventoryStockRecordCollection'),
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
            'inventoryId',
            'time',
            'quantity'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            inventoryId: {
              bsonType: 'string'
            },
            time: {
              bsonType: 'date'
            },
            quantity: {
              bsonType: 'int'
            }
          }
        }
      },
      indexes: [
        { key: { inventoryId: 1 } }
      ]
    })
);
