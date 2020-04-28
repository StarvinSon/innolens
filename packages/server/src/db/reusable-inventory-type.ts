import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface ReusableInventoryType {
  readonly _id: ObjectId;
  readonly typeId: string;
  readonly typeName: string;
}


export interface ReusableInventoryTypeCollection extends Collection<ReusableInventoryType> {}

export const ReusableInventoryTypeCollection = decorate(
  name('ReusableInventoryTypeCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<ReusableInventoryTypeCollection> =>
    db.defineCollection('reusableInventoryTypes', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          additionalProperties: false,
          required: [
            '_id',
            'typeId',
            'typeName'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            typeId: {
              bsonType: 'string'
            },
            typeName: {
              bsonType: 'string'
            }
          }
        }
      },
      indexes: [
        {
          key: { typeId: 1 },
          unique: true
        }
      ]
    })
);
