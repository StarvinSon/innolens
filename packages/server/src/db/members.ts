import { ObjectId, Collection } from 'mongodb';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';

import { createCollection } from './db';


export interface Member {
  readonly _id: ObjectId;
  readonly groupName: string;
}

export type MembersCollection = Collection<Member>;

export const MembersCollection = createToken<Promise<MembersCollection>>(module, 'MembersCollection');

// eslint-disable-next-line max-len
export const createMembersCollection: DependencyCreator<Promise<MembersCollection>> = async (appCtx) =>
  createCollection<Member>(appCtx, 'members', {
    validationLevel: 'strict',
    validationAction: 'error',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['_id', 'groupName'],
        additionalProperties: false,
        properties: {
          _id: {
            bsonType: 'objectId'
          },
          groupName: {
            bsonType: 'string'
          }
        }
      }
    }
  });

// eslint-disable-next-line max-len
export const registerMembersCollection = createSingletonDependencyRegistrant(MembersCollection, createMembersCollection);
