import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface ExpendableInventoryType {
  readonly _id: ObjectId;
  readonly typeId: string;
  readonly typeName: string;
}

export interface ExpendableInventoryTypeCollection extends Collection<ExpendableInventoryType> {}

export const ExpendableInventoryTypeCollection = decorate(
  name('ExpendableInventoryTypeCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<ExpendableInventoryTypeCollection> =>
    db.defineCollection('expendableInventoryTypes', {
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
