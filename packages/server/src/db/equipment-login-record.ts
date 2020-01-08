import { ObjectId, Collection } from 'mongodb';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';

import { Db } from './db';


export interface EquipmentLoginRecord {
  _id: ObjectId;
  memberId: ObjectId;
  equipmentType: string;
  time: Date;
}

export interface EquipmentLoginRecordCollection extends Collection<EquipmentLoginRecord> {}


export const createEquipmentLoginRecordCollection = async (options: {
  db: Db;
}): Promise<EquipmentLoginRecordCollection> => {
  const { db } = options;

  return db.defineCollection('equipmentLoginRecords', {
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


export const EquipmentLoginRecordCollection =
  createToken<Promise<EquipmentLoginRecordCollection>>(__filename, 'EquipmentLoginRecordCollection');

export const registerEquipmentLoginRecordCollection = createAsyncSingletonRegistrant(
  EquipmentLoginRecordCollection,
  { db: Db },
  createEquipmentLoginRecordCollection
);
