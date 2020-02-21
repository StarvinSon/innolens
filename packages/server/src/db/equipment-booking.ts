import {
  createToken, decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import { ObjectId, Collection } from 'mongodb';

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

export const EquipmentBookingCollection =
  createToken<EquipmentBookingCollection>('EquipmentBookingCollection');


export const createEquipmentBookingCollection = decorate(
  name('createEquipmentBookingCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<EquipmentBookingCollection> =>
    db.defineCollection('equipmentBookings', {
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
    })
);
