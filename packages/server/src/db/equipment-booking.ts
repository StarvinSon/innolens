import { ObjectId, Collection } from 'mongodb';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';

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


export const createEquipmentBookingCollection = async (options: {
  db: Db;
}): Promise<EquipmentBookingCollection> => {
  const { db } = options;

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


export const EquipmentBookingCollection =
  createToken<Promise<EquipmentBookingCollection>>(__filename, 'EquipmentBookingCollection');

export const registerEquipmentBookingCollection = createAsyncSingletonRegistrant(
  EquipmentBookingCollection,
  { db: Db },
  createEquipmentBookingCollection
);
