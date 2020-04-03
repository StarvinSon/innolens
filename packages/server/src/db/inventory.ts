import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export type Inventory = ExpendableInventory | ReusableInventory;

interface InventoryBase {
  readonly _id: ObjectId;
  readonly inventoryId: string;
  readonly inventoryName: string;
}

export interface ExpendableInventory extends InventoryBase {
  readonly type: 'expendable';
}

export interface ReusableInventory extends InventoryBase {
  readonly type: 'reusable';
  readonly items: ReadonlyArray<ReusableInventoryItem>;
}

export interface ReusableInventoryItem {
  readonly itemId: string;
}


export interface InventoryCollection extends Collection<Inventory> {}

export const InventoryCollection = decorate(
  name('InventoryCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<InventoryCollection> => {
    const baseSchema = {
      bsonType: 'object',
      additionalProperties: false,
      required: [
        '_id',
        'inventoryId',
        'inventoryName'
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
        }
      }
    };

    const expendableSchema = {
      ...baseSchema,
      required: [
        ...baseSchema.required,
        'type'
      ],
      properties: {
        ...baseSchema.properties,
        type: {
          enum: ['expendable']
        }
      }
    };

    const reusableSchema = {
      ...baseSchema,
      required: [
        ...baseSchema.required,
        'type',
        'items'
      ],
      properties: {
        ...baseSchema.properties,
        type: {
          enum: ['reusable']
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'itemId'
            ],
            properties: {
              itemId: {
                type: 'string'
              }
            }
          }
        }
      }
    };

    return db.defineCollection('inventories', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          oneOf: [
            expendableSchema,
            reusableSchema
          ]
        }
      },
      indexes: [
        {
          key: { inventoryId: 1 },
          unique: true
        }
      ]
    });
  }
);
