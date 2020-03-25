import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface Member {
  readonly _id: ObjectId;
  readonly memberId: string;
  readonly name: string;
  readonly department: string;
  readonly typeOfStudy: string;
  readonly yearOfStudy: string;
  readonly studyProgramme: string;
  readonly affiliatedStudentInterestGroup: string;
  readonly membershipStartTime: Date;
  readonly membershipEndTime: Date;
}


export interface MembersCollection extends Collection<Member> {}

export const MembersCollection = decorate(
  name('MembersCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<MembersCollection> =>
    db.defineCollection('members', {
      validationLevel: 'strict',
      validationAction: 'error',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          additionalProperties: false,
          required: [
            '_id',
            'memberId',
            'name',
            'department',
            'typeOfStudy',
            'studyProgramme',
            'yearOfStudy',
            'affiliatedStudentInterestGroup',
            'membershipStartTime',
            'membershipEndTime'
          ],
          properties: {
            _id: {
              bsonType: 'objectId'
            },
            memberId: {
              bsonType: 'string'
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
            studyProgramme: {
              bsonType: 'string'
            },
            yearOfStudy: {
              bsonType: 'string'
            },
            affiliatedStudentInterestGroup: {
              bsonType: 'string'
            },
            membershipStartTime: {
              bsonType: 'date'
            },
            membershipEndTime: {
              bsonType: 'date'
            }
          }
        }
      },
      indexes: [
        {
          key: { memberId: 1 },
          unique: true
        },
        {
          key: { membershipStartTime: 1, membershipEndTime: 1 }
        }
      ]
    })
);
