import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface Machine {
  readonly _id: ObjectId;
  readonly machineId: string;
  readonly machineName: string;
  readonly spaceId: string;
}


export interface MachineCollection extends Collection<Machine> {}

export const MachineCollection = decorate(
  name('MachineCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<MachineCollection> =>
    db.defineCollection('machines', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          additionalProperties: false,
          required: [
            '_id',
            'machineId',
            'machineName',
            'spaceId'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            machineId: {
              bsonType: 'string'
            },
            machineName: {
              bsonType: 'string'
            },
            spaceId: {
              bsonType: 'string'
            }
          }
        }
      },
      indexes: [
        {
          key: { machineId: 1 },
          unique: true
        }
      ]
    })
);
