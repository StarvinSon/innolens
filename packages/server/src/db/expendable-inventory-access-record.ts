import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface ExpendableInventoryAccessRecord {
  readonly _id: ObjectId;
  readonly typeId: string;
  readonly time: Date;
  readonly memberId: string;
  readonly quantity: number; // how many does the member take?
}


// eslint-disable-next-line max-len
export interface ExpendableInventoryAccessRecordCollection extends Collection<ExpendableInventoryAccessRecord> {}

export const ExpendableInventoryAccessRecordCollection = decorate(
  name('ExpendableInventoryAccessRecordCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<ExpendableInventoryAccessRecordCollection> =>
    db.defineCollection('expendableInventoryAccessRecords', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            '_id',
            'typeId',
            'time',
            'memberId',
            'quantity'
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
            memberId: {
              bsonType: 'string'
            },
            quantity: {
              bsonType: 'int'
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
