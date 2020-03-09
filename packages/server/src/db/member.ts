import {
  createToken, decorate, singleton,
  name, injectableFactory
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
  readonly registrationTime: Date;
}


export interface MemberCollection extends Collection<Member> {}

export const MemberCollection =
  createToken<MemberCollection>('MemberCollection');


export const createMemberCollection = decorate(
  name('createMemberCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<MemberCollection> =>
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
            'yearOfStudy',
            'studyProgramme',
            'affiliatedStudentInterestGroup',
            'registrationTime'
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
            yearOfStudy: {
              bsonType: 'string'
            },
            studyProgramme: {
              bsonType: 'string'
            },
            affiliatedStudentInterestGroup: {
              bsonType: 'string'
            },
            registrationTime: {
              bsonType: 'date'
            }
          }
        }
      },
      indexes: [
        {
          key: { memberId: 1 },
          unique: true
        }
      ]
    })
);
