import {
  createToken, decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import { ObjectId, Collection } from 'mongodb';

import { Db } from './db';


export interface EquipmentLoginRecord {
  _id: ObjectId;
  memberId: ObjectId;
  equipmentType: string;
  time: Date;
}


export interface EquipmentLoginRecordCollection extends Collection<EquipmentLoginRecord> {}

export const EquipmentLoginRecordCollection =
  createToken<EquipmentLoginRecordCollection>('EquipmentLoginRecordCollection');


export const createEquipmentLoginRecordCollection = decorate(
  name('createEquipmentLoginRecordCollection'),
  injectableFactory(Db),
  singleton(),
  async (db: Db): Promise<EquipmentLoginRecordCollection> =>
    db.defineCollection('equipmentLoginRecords', {
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
