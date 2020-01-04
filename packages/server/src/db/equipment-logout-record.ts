import { ObjectId, Collection } from 'mongodb';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';

import { Db } from './db';


export interface EquipmentLogoutRecord {
  _id: ObjectId;
  memberId: ObjectId;
  equipmentType: string;
  time: Date;
}


export interface EquipmentLogoutRecordCollection extends Collection<EquipmentLogoutRecord> {}

export const EquipmentLogoutRecordCollection = createToken<Promise<EquipmentLogoutRecordCollection>>(module, 'EquipmentLogoutRecordCollection');

// eslint-disable-next-line max-len
export const createEquipmentLogoutRecordCollection: DependencyCreator<Promise<EquipmentLogoutRecordCollection>> = async (appCtx) => {
  const db = await appCtx.resolve(Db);
  return db.defineCollection('equipmentLogoutRecords', {
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
  });
};

// eslint-disable-next-line max-len
export const registerEquipmentLogoutRecordCollection = createSingletonDependencyRegistrant(EquipmentLogoutRecordCollection, createEquipmentLogoutRecordCollection);
