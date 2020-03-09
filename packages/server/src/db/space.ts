import {
  createToken, decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface Space {
  readonly _id: ObjectId;
  readonly spaceId: string;
  readonly spaceName: string;
  readonly floor: string;
  readonly indoor: boolean;
}


export interface SpaceCollection extends Collection<Space> {}

export const SpaceCollection = createToken<SpaceCollection>('SpaceCollection');


export const createSpaceCollection = decorate(
  name('createSpaceCollection'),
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
            'spaceName',
            'floor',
            'indoor'
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
            },
            floor: {
              bsonType: 'string'
            },
            indoor: {
              bsonType: 'bool'
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
