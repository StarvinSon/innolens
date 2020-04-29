import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface MachineInstance {
  readonly _id: ObjectId;
  readonly typeId: string;
  readonly instanceId: string;
  readonly instanceName: string;
  readonly currentMemberIds: ReadonlyArray<string>;
  readonly versionId: ObjectId;
}


export interface MachineInstanceCollection extends Collection<MachineInstance> {}

export const MachineInstanceCollection = decorate(
  name('MachineInstanceCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<MachineInstanceCollection> =>
    db.defineCollection('machineInstances', {
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
            'instanceName',
            'currentMemberIds',
            'versionId'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            typeId: {
              bsonType: 'string'
            },
            instanceId: {
              bsonType: 'string'
            },
            instanceName: {
              bsonType: 'string'
            },
            currentMemberIds: {
              bsonType: 'array',
              items: {
                type: 'string'
              }
            },
            versionId: {
              bsonType: 'objectId'
            }
          }
        }
      },
      indexes: [
        {
          key: { typeId: 1, instanceId: 1 },
          unique: true
        }
      ]
    })
);
