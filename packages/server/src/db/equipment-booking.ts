import { ObjectId, Collection } from 'mongodb';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';

import { Db } from './db';


export interface EquipmentBooking {
  _id: ObjectId;
  memberId: ObjectId;
  equipmentType: string;
  startTime: Date;
  endTime: Date;
  signInTime: Date | null;
}


export interface EquipmentBookingCollection extends Collection<EquipmentBooking> {}

export const EquipmentBookingCollection = createToken<Promise<EquipmentBookingCollection>>(module, 'EquipmentBookingCollection');

// eslint-disable-next-line max-len
export const createEquipmentBookingCollection: DependencyCreator<Promise<EquipmentBookingCollection>> = async (appCtx) => {
  const db = await appCtx.resolve(Db);
  return db.defineCollection('equipmentBookings', {
    validationLevel: 'strict',
    validationAction: 'error',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: false,
        required: [
          '_id',
          'memberId',
          'equipmentType',
          'startTime',
          'endTime',
          'signInTime'
        ],
        properties: {
          _id: {
            bsonType: 'objectId'
          },
          memberId: {
            bsonType: 'objectId'
          },
          equipmentType: {
            bsonType: 'string'
          },
          startTime: {
            bsonType: 'date'
          },
          endTime: {
            bsonType: 'date'
          },
          signInTime: {
            oneOf: [{
              bsonType: 'date'
            }, {
              bsonType: 'null'
            }]
          }
        }
      }
    }
  });
};

// eslint-disable-next-line max-len
export const registerEquipmentBookingCollection = createSingletonDependencyRegistrant(EquipmentBookingCollection, createEquipmentBookingCollection);
