import { ObjectId, Collection } from 'mongodb';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';

import { Db } from './db';


export interface Member {
  readonly _id: ObjectId;
  readonly name: string;
  readonly department: string;
  readonly typeOfStudy: string;
  readonly yearOfStudy: string;
  readonly studyProgramme: string;
  readonly affiliatedStudentInterestGroup: string;
}

export interface MemberCollection extends Collection<Member> {}


export const createMemberCollection = async (options: {
  db: Db;
}): Promise<MemberCollection> => {
  const { db } = options;

  return db.defineCollection('members', {
    validationLevel: 'strict',
    validationAction: 'error',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: false,
        required: [
          '_id',
          'name',
          'department',
          'typeOfStudy',
          'yearOfStudy',
          'studyProgramme',
          'affiliatedStudentInterestGroup'
        ],
        properties: {
          _id: {
            bsonType: 'objectId'
          },
          name: {
            bsonType: 'string'
          },
          department: {
            bsonType: 'string'
          },
          typeOfStudy: {
            bsonType: 'string'
          },
          yearOfStudy: {
            bsonType: 'string'
          },
          studyProgramme: {
            bsonType: 'string'
          },
          affiliatedStudentInterestGroup: {
            bsonType: 'string'
          }
        }
      }
    }
  });
};


export const MemberCollection =
  createToken<Promise<MemberCollection>>(__filename, 'MemberCollection');

export const registerMemberCollection = createAsyncSingletonRegistrant(
  MemberCollection,
  { db: Db },
  createMemberCollection
);
