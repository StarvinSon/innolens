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
  readonly currentQuantity: number;
  readonly versionId: ObjectId;
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
            'typeName',
            'currentQuantity',
            'versionId'
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
            },
            currentQuantity: {
              bsonType: 'int'
            },
            versionId: {
              bsonType: 'objectId'
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
