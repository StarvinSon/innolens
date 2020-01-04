import { ObjectId, Collection } from 'mongodb';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';

import { Db } from './db';


export interface Member {
  readonly _id: ObjectId;
  readonly groupName: string;
}

export interface MemberCollection extends Collection<Member> {}

export const MemberCollection = createToken<Promise<MemberCollection>>(module, 'MemberCollection');

// eslint-disable-next-line max-len
export const createMemberCollection: DependencyCreator<Promise<MemberCollection>> = async (appCtx) => {
  const db = await appCtx.resolve(Db);

  return db.defineCollection('members', {
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
};

// eslint-disable-next-line max-len
export const registerMemberCollection = createSingletonDependencyRegistrant(MemberCollection, createMemberCollection);
