import { ObjectId, Collection } from 'mongodb';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';

import { Db } from './db';


export interface EquipmentLoginRecord {
  _id: ObjectId;
  memberId: ObjectId;
  equipmentType: string;
  time: Date;
}


export interface EquipmentLoginRecordCollection extends Collection<EquipmentLoginRecord> {}

export const EquipmentLoginRecordCollection = createToken<Promise<EquipmentLoginRecordCollection>>(module, 'EquipmentLoginRecordCollection');

// eslint-disable-next-line max-len
export const createEquipmentLoginRecordCollection: DependencyCreator<Promise<EquipmentLoginRecordCollection>> = async (appCtx) => {
  const db = await appCtx.resolve(Db);
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

// eslint-disable-next-line max-len
export const registerEquipmentLoginRecordCollection = createSingletonDependencyRegistrant(EquipmentLoginRecordCollection, createEquipmentLoginRecordCollection);
