import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/lib-node';
import { ObjectId, Collection, Long } from 'mongodb';

import { Db } from './db';


export type ExpendableInventoryQuantityRecord =
  ExpendableInventoryQuantitySetRecord | ExpendableInventoryQuantityTakeRecord;

interface ExpendableInventoryQuantityRecordBase {
  readonly _id: ObjectId;
  readonly typeId: string;
  readonly time: Date;
  readonly quantity: number;
  readonly versionId: Long;
}

// eslint-disable-next-line max-len
export interface ExpendableInventoryQuantitySetRecord extends ExpendableInventoryQuantityRecordBase {
  readonly action: 'set';
}

// eslint-disable-next-line max-len
export interface ExpendableInventoryQuantityTakeRecord extends ExpendableInventoryQuantityRecordBase {
  readonly action: 'take';
  readonly memberId: string;
  readonly takeQuantity: number; // how many does the member take?
}


// eslint-disable-next-line max-len
export interface ExpendableInventoryQuantityRecordCollection extends Collection<ExpendableInventoryQuantityRecord> {}

export const ExpendableInventoryQuantityRecordCollection = decorate(
  name('ExpendableInventoryQuantityRecordCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<ExpendableInventoryQuantityRecordCollection> => {
    const commonSchema = {
      bsonType: 'object',
      required: [
        '_id',
        'typeId',
        'time',
        'quantity',
        'versionId'
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
        versionId: {
          bsonType: 'long'
        }
      }
    };
    const setSchema = {
      ...commonSchema,
      required: [...commonSchema.required, 'action'],
      properties: {
        ...commonSchema.properties,
        action: {
          enum: ['set']
        }
      }
    };

    const takeSchema = {
      ...commonSchema,
      required: [...commonSchema.required, 'action', 'memberId', 'takeQuantity'],
      properties: {
        ...commonSchema.properties,
        action: {
          enum: ['take']
        },
        memberId: {
          bsonType: 'string'
        },
        takeQuantity: {
          bsonType: 'int'
        }
      }
    };

    return db.defineCollection('expendableInventoryQuantityRecords', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          anyOf: [
            setSchema,
            takeSchema
          ]
        }
      },
      indexes: [
        {
          key: { typeId: 1, time: 1, versionId: 1 },
          unique: true
        }
      ]
    });
  }
);
