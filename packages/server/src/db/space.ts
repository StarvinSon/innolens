import {
  decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver/node';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface Space {
  readonly _id: ObjectId;
  readonly spaceId: string;
  readonly spaceName: string;
  readonly currentMemberIds: ReadonlyArray<string>;
  readonly versionId: ObjectId;
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
            'spaceName',
            'currentMemberIds',
            'versionId'
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
            currentMemberIds: {
              bsonType: 'array',
              items: {
                bsonType: 'string'
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
          key: { spaceId: 1 },
          unique: true
        }
      ]
    })
);
