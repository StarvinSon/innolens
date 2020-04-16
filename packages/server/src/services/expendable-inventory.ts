import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { addMilliseconds } from 'date-fns';
import { FilterQuery, QuerySelector } from 'mongodb';

// eslint-disable-next-line import/order
import { MemberCollection } from '../db/member';
import { ExpendableInventoryAccessRecord, ExpendableInventoryAccessRecordCollection } from '../db/expendable-inventory-access-record';
import { ExpendableInventoryQuantityRecord, ExpendableInventoryQuantityRecordCollection } from '../db/expendable-inventory-quantity-record';
import { ExpendableInventoryType, ExpendableInventoryTypeCollection } from '../db/expendable-inventory-type';
import { Writable } from '../utils/object';
import { raceSettled } from '../utils/promise';

import { Member } from './member';


export class ExpendableInventoryTypeNotFoundError extends Error {
  public constructor(typeIds: ReadonlyArray<string>) {
    super(`Cannot find expendable inventory with type id: ${typeIds.join(', ')}`);
  }
}


export {
  ExpendableInventoryType,
  ExpendableInventoryQuantityRecord,
  ExpendableInventoryAccessRecord
};


export const expendableInventoryAggregatedQuantityHistoryGroupBys = [
  'typeId'
] as const;

export type ExpendableInventoryAggregatedQuantityHistoryGroupBy =
  (typeof expendableInventoryAggregatedQuantityHistoryGroupBys)[number];

export interface ExpendableInventoryAggregatedQuantityHistory {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<ExpendableInventoryAggregatedQuantityRecord>;
}

export interface ExpendableInventoryAggregatedQuantityRecord {
  readonly time: Date;
  readonly counts: {
    readonly [group: string]: number;
  };
}


export const expendableInventoryAggregatedAccessHistoryGroupBys = [
  'department',
  'typeOfStudy',
  'studyProgramme',
  'yearOfStudy',
  'affiliatedStudentInterestGroup'
] as const;

export type ExpendableInventoryAggregatedAccessHistoryGroupBy =
  (typeof expendableInventoryAggregatedAccessHistoryGroupBys)[number];

export const expendableInventoryAggregatedAccessHistoryCountTypes = [
  'total',
  'uniqueMember'
] as const;

export type ExpendableInventoryAggregatedAccessHistoryCountType =
  (typeof expendableInventoryAggregatedAccessHistoryCountTypes)[number];

export interface ExpendableInventoryAggregatedAccessHistory {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<ExpendableInventoryAggregatedAccessRecord>;
}

export interface ExpendableInventoryAggregatedAccessRecord {
  readonly startTime: Date;
  readonly endTime: Date;
  readonly counts: {
    readonly [group: string]: number;
  };
}


@injectableConstructor({
  expendableInventoryTypeCollection: ExpendableInventoryTypeCollection,
  expendableInventoryInstanceCollection: ExpendableInventoryQuantityRecordCollection,
  expendableInventoryAccessRecordCollection: ExpendableInventoryAccessRecordCollection,
  memberCollection: MemberCollection
})
@singleton()
export class ExpendableInventoryService {
  private readonly _typeCollection: ExpendableInventoryTypeCollection;
  private readonly _quantityRecordCollection: ExpendableInventoryQuantityRecordCollection;
  private readonly _accessRecordCollection: ExpendableInventoryAccessRecordCollection;
  private readonly _memberCollection: MemberCollection;

  public constructor(deps: {
    expendableInventoryTypeCollection: ExpendableInventoryTypeCollection;
    expendableInventoryInstanceCollection: ExpendableInventoryQuantityRecordCollection;
    expendableInventoryAccessRecordCollection: ExpendableInventoryAccessRecordCollection;
    memberCollection: MemberCollection;
  }) {
    ({
      expendableInventoryTypeCollection: this._typeCollection,
      expendableInventoryInstanceCollection: this._quantityRecordCollection,
      expendableInventoryAccessRecordCollection: this._accessRecordCollection,
      memberCollection: this._memberCollection
    } = deps);
  }


  public async importTypes(types: ReadonlyArray<Omit<ExpendableInventoryType, '_id'>>): Promise<void> {
    if (types.length === 0) return;
    await this._typeCollection
      .bulkWrite(
        types.map((type) => ({
          replaceOne: {
            filter: {
              typeId: type.typeId
            },
            replacement: type,
            upsert: true
          }
        })),
        { ordered: false }
      );
  }

  public async getTypes(): Promise<Array<ExpendableInventoryType>> {
    return this._typeCollection.find({}).toArray();
  }

  private async _hasType(typeId: string): Promise<boolean> {
    const count = await this._typeCollection
      .countDocuments({ typeId }, { limit: 1 });
    return count >= 1;
  }

  private async _hasAllTypes(typeIds: ReadonlyArray<string>): Promise<boolean> {
    const promises = new Set(typeIds.map(async (id) => this._hasType(id)));
    while (promises.size > 0) {
      // eslint-disable-next-line no-await-in-loop
      const result = await raceSettled(promises);
      promises.delete(result.promise);
      if (result.status === 'rejected') {
        throw result.reason;
      }
      if (!result.value) {
        return false;
      }
    }
    return true;
  }


  public async importQuantitySetAndAccessRecords(
    typeId: string,
    deleteFromTime: Date | null,
    deleteToTime: Date | null,
    quantitySetRecords: ReadonlyArray<Omit<ExpendableInventoryQuantityRecord, '_id' | 'typeId' | 'mode'>>,
    accessRecords: ReadonlyArray<Omit<ExpendableInventoryAccessRecord, '_id' | 'typeId'>>
  ): Promise<void> {
    if (!await this._hasType(typeId)) {
      throw new ExpendableInventoryTypeNotFoundError([typeId]);
    }

    const iterateSortedRecords = function* (): IterableIterator<{
      type: 'quantitySet',
      record: Omit<ExpendableInventoryQuantityRecord, '_id' | 'typeId' | 'mode'>
    } | {
      type: 'access',
      record: Omit<ExpendableInventoryAccessRecord, '_id' | 'typeId'>
    }> {
      let i = 0;
      let j = 0;
      while (i < quantitySetRecords.length || j < accessRecords.length) {
        while (
          i < quantitySetRecords.length
          && (j >= accessRecords.length || quantitySetRecords[i].time <= accessRecords[j].time)
        ) {
          yield {
            type: 'quantitySet',
            record: quantitySetRecords[i]
          };
          i += 1;
        }
        while (
          j < accessRecords.length
          && (i >= quantitySetRecords.length || accessRecords[j].time < quantitySetRecords[i].time)
        ) {
          yield {
            type: 'access',
            record: accessRecords[j]
          };
          j += 1;
        }
      }
    };

    const quantityRecordsToStore: Array<Omit<ExpendableInventoryQuantityRecord, '_id'>> = [];
    const accessRecordsToStore: Array<Omit<ExpendableInventoryAccessRecord, '_id'>> = [];

    let currQuantity = 0;
    for (const record of iterateSortedRecords()) {
      switch (record.type) {
        case 'quantitySet': {
          currQuantity = record.record.quantity;
          quantityRecordsToStore.push({
            time: record.record.time,
            typeId,
            quantity: record.record.quantity,
            mode: 'set'
          });
          break;
        }
        case 'access': {
          currQuantity -= record.record.quantity;
          quantityRecordsToStore.push({
            time: record.record.time,
            typeId,
            quantity: currQuantity,
            mode: 'access'
          });
          accessRecordsToStore.push({
            time: record.record.time,
            typeId,
            memberId: record.record.memberId,
            quantity: record.record.quantity
          });
          break;
        }
        default: {
          throw new Error(`Unknown record type: ${record!.type}`);
        }
      }
    }

    const deleteQuantityRecordFilter: FilterQuery<Writable<ExpendableInventoryQuantityRecord>> = {
      typeId
    };
    const deleteAccessRecordFilter: FilterQuery<Writable<ExpendableInventoryAccessRecord>> = {
      typeId
    };
    if (deleteFromTime !== null || deleteToTime !== null) {
      const timeQuerySelector: QuerySelector<Date> = {};
      if (deleteFromTime !== null) timeQuerySelector.$gte = deleteFromTime;
      if (deleteToTime !== null) timeQuerySelector.$lt = deleteToTime;
      deleteQuantityRecordFilter.time = timeQuerySelector;
      deleteAccessRecordFilter.time = timeQuerySelector;
    }
    await Promise.all([
      this._quantityRecordCollection.deleteMany(deleteQuantityRecordFilter),
      this._accessRecordCollection.deleteMany(deleteQuantityRecordFilter)
    ]);

    await Promise.all([
      this._quantityRecordCollection.insertMany(quantityRecordsToStore),
      this._accessRecordCollection.insertMany(accessRecordsToStore)
    ]);
  }


  public async getQuantityHistory(
    startTime: Date,
    endTime: Date,
    timeStepMs: number,
    typeIds: ReadonlyArray<string> | null,
    groupBy: ExpendableInventoryAggregatedQuantityHistoryGroupBy | null
  ): Promise<ExpendableInventoryAggregatedQuantityHistory> {
    if (typeIds !== null && !await this._hasAllTypes(typeIds)) {
      throw new ExpendableInventoryTypeNotFoundError(typeIds);
    }

    type QuantityRecord = Pick<ExpendableInventoryQuantityRecord, 'time' | 'typeId' | 'quantity'>;
    const [lastQuantityRecords, quantityRecords] = await Promise.all([
      this._quantityRecordCollection.aggregate<QuantityRecord>([
        {
          $match: {
            ...typeIds === null ? {} : {
              typeId: {
                $in: typeIds.slice()
              }
            },
            time: {
              $lt: startTime
            }
          }
        },
        {
          $sort: {
            typeId: 1,
            time: -1,
            _id: -1
          }
        },
        {
          $group: {
            _id: '$typeId',
            typeId: { $first: '$typeId' },
            time: { $first: '$time' },
            quantity: { $first: '$quantity' }
          }
        }
      ]).toArray(),
      this._quantityRecordCollection.find(
        {
          ...typeIds === null ? {} : {
            typeId: {
              $in: typeIds.slice()
            }
          },
          time: {
            $gte: startTime,
            $lt: endTime
          }
        },
        {
          sort: {
            time: 1
          }
        }
      ).toArray()
    ] as const);

    // Create group filters
    let groupFilters: ReadonlyArray<{
      readonly name: string;
      readonly filter: (record: QuantityRecord) => boolean;
    }>;
    switch (groupBy) {
      case null: {
        groupFilters = [{
          name: 'total',
          filter: () => true
        }];
        break;
      }
      case 'typeId': {
        const groupNames = Array.from(new Set(quantityRecords.map((record) => record.typeId)));
        groupFilters = groupNames.map((groupName) => ({
          name: groupName,
          filter: (record) => record.typeId === groupName
        }));
        break;
      }
      default: {
        throw new Error(`Unsupported groupBy: ${groupBy}`);
      }
    }

    const reduceGroupRecords =
      (records: ReadonlyArray<QuantityRecord>): number => {
        let quantity = 0;
        for (const record of records) {
          quantity += record.quantity;
        }
        return quantity;
      };

    // Get history
    let i = 0;
    const historyRecords: Array<ExpendableInventoryAggregatedQuantityRecord> = [];
    const latestQuantityRecords: Map<string, QuantityRecord> = new Map();
    for (const lastQuantityRecord of lastQuantityRecords) {
      latestQuantityRecords.set(lastQuantityRecord.typeId, lastQuantityRecord);
    }
    for (
      let time = addMilliseconds(startTime, timeStepMs);
      time <= endTime;
      time = addMilliseconds(time, timeStepMs)
    ) {
      while (i < quantityRecords.length && quantityRecords[i].time <= time) {
        latestQuantityRecords.set(quantityRecords[i].typeId, quantityRecords[i]);
        i += 1;
      }

      // eslint-disable-next-line max-len
      interface WritableAggregatedQuantityRecord extends ExpendableInventoryAggregatedQuantityRecord {
        readonly counts: Writable<ExpendableInventoryAggregatedQuantityRecord['counts']>;
      }
      const historyRecord: WritableAggregatedQuantityRecord = {
        time,
        counts: {}
      };
      for (const groupFilter of groupFilters) {
        const groupRecords = Array
          .from(latestQuantityRecords.values())
          .filter((r) => groupFilter.filter(r));
        const groupValue = reduceGroupRecords(groupRecords);
        historyRecord.counts[groupFilter.name] = groupValue;
      }
      historyRecords.push(historyRecord);
    }

    return {
      groups: groupFilters.map((filter) => filter.name),
      records: historyRecords
    };
  }

  public async getAccessHistory(
    startTime: Date,
    endTime: Date,
    timeStepMs: number,
    typeIds: ReadonlyArray<string> | null,
    groupBy: ExpendableInventoryAggregatedAccessHistoryGroupBy | null,
    countType: ExpendableInventoryAggregatedAccessHistoryCountType | null
  ): Promise<ExpendableInventoryAggregatedAccessHistory> {
    if (typeIds !== null && !await this._hasAllTypes(typeIds)) {
      throw new ExpendableInventoryTypeNotFoundError(typeIds);
    }

    type Record = ExpendableInventoryAccessRecord & { readonly member?: Member };
    const accessRecords = await this._accessRecordCollection.aggregate<Record>([
      {
        $match: {
          ...typeIds === null ? {} : {
            typeId: {
              $in: typeIds
            }
          },
          time: {
            $gte: startTime,
            $lt: endTime
          }
        }
      },
      {
        $sort: {
          time: 1
        }
      },
      {
        $lookup: {
          from: this._memberCollection.collectionName,
          localField: 'memberId',
          foreignField: 'memberId',
          as: 'member'
        }
      },
      {
        $unwind: {
          path: '$member',
          preserveNullAndEmptyArrays: true
        }
      }
    ]).toArray();

    // Create group filters
    let groupFilters: ReadonlyArray<{
      readonly name: string;
      readonly filter: (accessRecord: Record) => boolean;
    }>;
    switch (groupBy) {
      case null: {
        groupFilters = [{
          name: 'total',
          filter: () => true
        }];
        break;
      }
      case 'department':
      case 'typeOfStudy':
      case 'studyProgramme':
      case 'yearOfStudy':
      case 'affiliatedStudentInterestGroup': {
        const getGroupName = (record: Record): string => record.member?.[groupBy] ?? 'unknown';
        const groupNames = Array.from(new Set(accessRecords.map(getGroupName)));
        groupFilters = groupNames.map((groupName) => ({
          name: groupName,
          filter: (record: Record) => getGroupName(record) === groupName
        }));
        break;
      }
      default: {
        throw new Error(`Unsupported groupBy: ${groupBy}`);
      }
    }

    // Create group record reducer
    let reduceGroupRecords: (records: ReadonlyArray<Record>) => number;
    switch (countType) {
      case 'total': {
        reduceGroupRecords = (records) => {
          let quantity = 0;
          for (const record of records) {
            quantity += record.quantity;
          }
          return quantity;
        };
        break;
      }
      case 'uniqueMember': {
        reduceGroupRecords = (records) => {
          const memberIds = records
            .filter((r) => r.quantity > 0)
            .map((r) => r.member?.memberId)
            .filter((id): id is string => id !== undefined);
          return new Set(memberIds).size;
        };
        break;
      }
      default: {
        throw new Error(`Unsupported count type: ${countType}`);
      }
    }

    // Get history
    let i = 0;
    const historyRecords: Array<ExpendableInventoryAggregatedAccessRecord> = [];
    for (
      let periodStartTime = startTime, periodEndTime = addMilliseconds(periodStartTime, timeStepMs);
      periodEndTime <= endTime;
      periodStartTime = periodEndTime, periodEndTime = addMilliseconds(periodEndTime, timeStepMs)
    ) {
      const recordsWithinPeriod: Array<Record> = [];
      while (
        i < accessRecords.length
        && accessRecords[i].time < periodEndTime
      ) {
        recordsWithinPeriod.push(accessRecords[i]);
        i += 1;
      }

      interface WritableRecord extends Writable<ExpendableInventoryAggregatedAccessRecord> {
        readonly counts: Writable<ExpendableInventoryAggregatedAccessRecord['counts']>;
      }
      const historyRecord: WritableRecord = {
        startTime: periodStartTime,
        endTime: periodEndTime,
        counts: {}
      };
      for (const groupFilter of groupFilters) {
        const groupRecords = recordsWithinPeriod.filter((r) => groupFilter.filter(r));
        const reducedValue = reduceGroupRecords(groupRecords);
        historyRecord.counts[groupFilter.name] = reducedValue;
      }
      historyRecords.push(historyRecord);
    }

    return {
      groups: groupFilters.map((filter) => filter.name),
      records: historyRecords
    };
  }
}
