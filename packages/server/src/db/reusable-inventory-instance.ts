import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface ReusableInventoryInstance {
  readonly _id: ObjectId;
  readonly typeId: string;
  readonly instanceId: string;
  readonly instanceName: string;
}

// eslint-disable-next-line max-len
export interface ReusableInventoryInstanceCollection extends Collection<ReusableInventoryInstance> {}

export const ReusableInventoryInstanceCollection = decorate(
  name('ReusableInventoryInstanceCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<ReusableInventoryInstanceCollection> =>
    db.defineCollection('reusableInventoryInstances', {
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
            'instanceName'
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
