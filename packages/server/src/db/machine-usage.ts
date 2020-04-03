import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface MachineUsage {
  readonly _id: ObjectId;
  readonly machineId: string;
  readonly memberId: string;
  readonly time: Date;
  readonly action: string;
}


export interface MachineUsageCollection extends Collection<MachineUsage> {}

export const MachineUsageCollection = decorate(
  name('MachineUsageCollection'),
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
            'machineId',
            'memberId',
            'time',
            'action'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            machineId: {
              bsonType: 'string'
            },
            memberId: {
              bsonType: 'string'
            },
            time: {
              bsonType: 'date'
            },
            action: {
              bsonType: 'string'
            }
          }
        }
      },
      indexes: [
        {
          key: { machineId: 1 }
        }
      ]
    })
);
