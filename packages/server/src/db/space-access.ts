import {
  createToken, decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface SpaceAccess {
  _id: ObjectId;
  memberId: string;
  spaceId: string;
  startTime: Date;
  endTime: Date;
}


export interface SpaceAccessCollection extends Collection<SpaceAccess> {}

export const SpaceAccessCollection =
  createToken<SpaceAccessCollection>('SpaceAccessCollection');


export const createSpaceAccessCollection = decorate(
  name('createSpaceAccessCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<SpaceAccessCollection> =>
    db.defineCollection('spaceAccesses', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          additionalProperties: false,
          required: [
            '_id',
            'memberId',
            'spaceId',
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
            spaceId: {
              bsonType: 'string'
            },
            startTime: {
              bsonType: 'date'
            },
            endTime: {
              bsonType: 'date'
            }
          }
        }
      },
      indexes: [
        {
          key: { spaceId: 1 }
        }
      ]
    })
);
