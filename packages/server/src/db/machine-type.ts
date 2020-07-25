import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/lib-node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface MachineType {
  readonly _id: ObjectId;
  readonly typeId: string;
  readonly typeName: string;
}


export interface MachineTypeCollection extends Collection<MachineType> {}

export const MachineTypeCollection = decorate(
  name('MachineTypeCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<MachineTypeCollection> =>
    db.defineCollection('machineTypes', {
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
