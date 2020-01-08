import { ObjectId, Collection } from 'mongodb';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';

import { Db } from './db';


export interface EquipmentLogoutRecord {
  _id: ObjectId;
  memberId: ObjectId;
  equipmentType: string;
  time: Date;
}

export interface EquipmentLogoutRecordCollection extends Collection<EquipmentLogoutRecord> {}


export const createEquipmentLogoutRecordCollection = async (options: {
  db: Db;
}): Promise<EquipmentLogoutRecordCollection> => {
  const { db } = options;

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


export const EquipmentLogoutRecordCollection =
  createToken<Promise<EquipmentLogoutRecordCollection>>(__filename, 'EquipmentLogoutRecordCollection');

export const registerEquipmentLogoutRecordCollection = createAsyncSingletonRegistrant(
  EquipmentLogoutRecordCollection,
  { db: Db },
  createEquipmentLogoutRecordCollection
);
