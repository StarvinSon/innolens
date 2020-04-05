import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface SpaceAccessRecord {
  _id: ObjectId;
  spaceId: string;
  memberId: string;
  time: Date;
  action: 'enter' | 'exit';
}


export interface SpaceAccessRecordCollection extends Collection<SpaceAccessRecord> {}

export const SpaceAccessRecordCollection = decorate(
  name('SpaceAccessRecordCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<SpaceAccessRecordCollection> =>
    db.defineCollection('spaceAccessesRecords', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          additionalProperties: false,
          required: [
            '_id',
            'spaceId',
            'memberId',
            'time',
            'action'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            spaceId: {
              bsonType: 'string'
            },
            memberId: {
              bsonType: 'string'
            },
            time: {
              bsonType: 'date'
            },
            action: {
              enum: ['enter', 'exit']
            }
          }
        }
      },
      indexes: [
        {
          key: { spaceId: 1, time: 1 }
        }
      ]
    })
);
