import {
  createToken, decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface MachineUsage {
  readonly _id: ObjectId;
  readonly memberId: string;
  readonly machineId: string;
  readonly startTime: Date;
  readonly endTime: Date;
}


export interface MachineUsageCollection extends Collection<MachineUsage> {}

export const MachineUsageCollection =
  createToken<MachineUsageCollection>('MachineUsageCollection');


export const createMachineUsageCollection = decorate(
  name('createMachineUsageCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<MachineUsageCollection> =>
    db.defineCollection('machineUsage', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          additionalProperties: false,
          required: [
            '_id',
            'memberId',
            'machineId',
            'startTime',
            'endTime'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            memberId: {
              bsonType: 'string'
            },
            machineId: {
              bsonType: 'string'
            },
            startTime: {
              bsonType: 'string'
            },
            endTime: {
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
