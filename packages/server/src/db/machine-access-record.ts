import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface MachineAccessRecord {
  readonly _id: ObjectId;
  readonly typeId: string;
  readonly instanceId: string;
  readonly memberId: string;
  readonly time: Date;
  readonly action: 'acquire' | 'release';
}


export interface MachineAccessRecordCollection extends Collection<MachineAccessRecord> {}

export const MachineAccessRecordCollection = decorate(
  name('MachineAccessRecordCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<MachineAccessRecordCollection> =>
    db.defineCollection('machineAccessRecords', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          additionalProperties: false,
          required: [
            '_id',
            'typeId',
            'instanceId',
            'memberId',
            'time',
            'action'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            typeId: {
              bsonType: 'string'
            },
            memberId: {
              bsonType: 'string'
            },
            instanceId: {
              bsonType: 'string'
            },
            time: {
              bsonType: 'date'
            },
            action: {
              enum: ['acquire', 'release']
            }
          }
        }
      },
      indexes: [
        {
          key: { typeId: 1, instanceId: 1, time: 1 }
        }
      ]
    })
);
