import {
  createToken, decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface EquipmentLogoutRecord {
  _id: ObjectId;
  memberId: ObjectId;
  equipmentType: string;
  time: Date;
}


export interface EquipmentLogoutRecordCollection extends Collection<EquipmentLogoutRecord> {}

export const EquipmentLogoutRecordCollection =
  createToken<EquipmentLogoutRecordCollection>('EquipmentLogoutRecordCollection');


export const createEquipmentLogoutRecordCollection = decorate(
  name('createEquipmentLogoutRecordCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<EquipmentLogoutRecordCollection> =>
    db.defineCollection('equipmentLogoutRecords', {
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
            'time'
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
            time: {
              bsonType: 'date'
            }
          }
        }
      }
    })
);
