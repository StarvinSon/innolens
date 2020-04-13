import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface ExpendableInventoryQuantityRecord {
  readonly _id: ObjectId;
  readonly typeId: string;
  readonly time: Date;
  readonly quantity: number;
  readonly mode: 'access' | 'set';
}


// eslint-disable-next-line max-len
export interface ExpendableInventoryQuantityRecordCollection extends Collection<ExpendableInventoryQuantityRecord> {}

export const ExpendableInventoryQuantityRecordCollection = decorate(
  name('ExpendableInventoryQuantityRecordCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<ExpendableInventoryQuantityRecordCollection> =>
    db.defineCollection('expendableInventoryQuantityRecords', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            '_id',
            'typeId',
            'time',
            'quantity',
            'mode'
          ],
          additionalProperties: false,
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            typeId: {
              bsonType: 'string'
            },
            time: {
              bsonType: 'date'
            },
            quantity: {
              bsonType: 'int'
            },
            mode: {
              enum: ['access', 'set']
            }
          }
        }
      },
      indexes: [
        {
          key: { typeId: 1, time: 1 }
        }
      ]
    })
);
