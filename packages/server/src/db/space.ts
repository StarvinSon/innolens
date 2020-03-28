import {
  decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface Space {
  readonly _id: ObjectId;
  readonly spaceId: string;
  readonly spaceName: string;
}


export interface SpaceCollection extends Collection<Space> {}

export const SpaceCollection = decorate(
  name('SpaceCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<SpaceCollection> =>
    db.defineCollection('spaces', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          additionalProperties: false,
          required: [
            '_id',
            'spaceId',
            'spaceName'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            spaceId: {
              bsonType: 'string'
            },
            spaceName: {
              bsonType: 'string'
            }
          }
        }
      },
      indexes: [
        {
          key: { spaceId: 1 },
          unique: true
        }
      ]
    })
);
