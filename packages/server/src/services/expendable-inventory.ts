import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { addMilliseconds, subMilliseconds } from 'date-fns';
import { ObjectId } from 'mongodb';

import {
  ExpendableInventoryQuantityRecord, ExpendableInventoryQuantityRecordCollection,
  ExpendableInventoryQuantitySetRecord, ExpendableInventoryQuantityTakeRecord
} from '../db/expendable-inventory-quantity-record';
import { ExpendableInventoryType, ExpendableInventoryTypeCollection } from '../db/expendable-inventory-type';
import { MemberCollection } from '../db/member';

import { HistoryForecastService } from './history-forecast';
import { timeSpanRange, timeSpanRepeat } from './time';


export class ExpendableInventoryTypeNotFoundError extends Error {
  public constructor(typeIds: ReadonlyArray<string>) {
    super(`Cannot find expendable inventory with type id: ${typeIds.join(', ')}`);
  }
}


export {
  ExpendableInventoryType,
  ExpendableInventoryQuantityRecord
};


export type ExpendableInventoryImportInstanceAccessRecord =
  Pick<ExpendableInventoryQuantitySetRecord, 'action' | 'time' | 'quantity'>
  | Pick<ExpendableInventoryQuantityTakeRecord, 'action' | 'time' | 'memberId' | 'takeQuantity'>;


export type ExpendableInventoryQuantityGroupBy =
  'type'
  | null;

export interface ExpendableInventoryQuantity {
  readonly groups: ReadonlyArray<string>;
  readonly values: ReadonlyArray<number>;
}


export type ExpendableInventoryQuantityHistoryGroupBy =
  null
  | 'type'
  | 'member'
  | 'department'
  | 'typeOfStudy'
  | 'studyProgramme'
  | 'yearOfStudy'
  | 'affiliatedStudentInterestGroup';

export type ExpendableInventoryQuantityHistoryCountType =
  'quantity'
  | 'take'
  | 'uniqueTake';

export interface ExpendableInventoryQuantityHistory {
  readonly timeSpans: ReadonlyArray<readonly [Date, Date]>;
  readonly groups: ReadonlyArray<string>;
  readonly values: ReadonlyArray<ReadonlyArray<number>>;
}


export type ExpendableInventoryQuantityForecastGroupBy =
  ExpendableInventoryQuantityHistoryGroupBy;

export type ExpendableInventoryQuantityForecastCountType =
  ExpendableInventoryQuantityHistoryCountType;

export type ExpendableInventoryQuantityForecast =
  ExpendableInventoryQuantityHistory;


@injectableConstructor({
  expendableInventoryTypeCollection: ExpendableInventoryTypeCollection,
  expendableInventoryInstanceCollection: ExpendableInventoryQuantityRecordCollection,
  memberCollection: MemberCollection,
  historyForecastService: HistoryForecastService
})
@singleton()
export class ExpendableInventoryService {
  private readonly _typeCollection: ExpendableInventoryTypeCollection;
  private readonly _quantityRecordCollection: ExpendableInventoryQuantityRecordCollection;
  private readonly _memberCollection: MemberCollection;
  private readonly _historyForecastService: HistoryForecastService;

  public constructor(deps: {
    expendableInventoryTypeCollection: ExpendableInventoryTypeCollection;
    expendableInventoryInstanceCollection: ExpendableInventoryQuantityRecordCollection;
    memberCollection: MemberCollection;
    historyForecastService: HistoryForecastService;
  }) {
    ({
      expendableInventoryTypeCollection: this._typeCollection,
      expendableInventoryInstanceCollection: this._quantityRecordCollection,
      memberCollection: this._memberCollection,
      historyForecastService: this._historyForecastService
    } = deps);
  }


  public async importTypes(types: ReadonlyArray<Pick<ExpendableInventoryType, 'typeId' | 'typeName' | 'typeCapacity'>>): Promise<void> {
    if (types.length === 0) return;
    await this._typeCollection
      .bulkWrite(
        types.map((type) => ({
          updateOne: {
            filter: {
              typeId: type.typeId
            },
            update: {
              $set: {
                typeName: type.typeName,
                typeCapacity: type.typeCapacity,
                versionId: new ObjectId()
              },
              $setOnInsert: {
                currentQuantity: 0
              }
            },
            upsert: true
          }
        })),
        { ordered: false }
      );
  }

  public async getTypes(): Promise<ReadonlyArray<ExpendableInventoryType>> {
    return this._typeCollection.find({}).toArray();
  }

  private async _hasType(typeId: string): Promise<boolean> {
    const count = await this._typeCollection
      .countDocuments({ typeId }, { limit: 1 });
    return count >= 1;
  }

  private async _hasAllTypes(typeIds: ReadonlyArray<string>): Promise<ReadonlyArray<string>> {
    const matchedTypes = await this._typeCollection.find({
      typeId: {
        $in: typeIds.slice()
      }
    }).toArray();
    const matchedTypeIds = new Set(matchedTypes.map((type) => type.typeId));
    return typeIds.filter((typeId) => !matchedTypeIds.has(typeId));
  }


  public async importAccessRecords(
    typeId: string,
    deleteFromTime: Date | null,
    importRecords: ReadonlyArray<ExpendableInventoryImportInstanceAccessRecord>
  ): Promise<void> {
    if (!await this._hasType(typeId)) {
      throw new ExpendableInventoryTypeNotFoundError([typeId]);
    }

    await this._quantityRecordCollection.deleteMany({
      typeId,
      ...deleteFromTime === null ? {} : {
        time: {
          $gte: deleteFromTime
        }
      }
    });

    const latestQuantityRecord = await this._quantityRecordCollection.findOne({
      typeId
    }, {
      sort: {
        time: -1,
        _id: -1
      }
    });

    let latestQuantity = latestQuantityRecord === null ? 0 : latestQuantityRecord.quantity;
    const quantityRecords: Array<Omit<ExpendableInventoryQuantitySetRecord, '_id'> | Omit<ExpendableInventoryQuantityTakeRecord, '_id'>> = [];

    for (const importRecord of importRecords) {
      switch (importRecord.action) {
        case 'set': {
          latestQuantity = importRecord.quantity;
          quantityRecords.push({
            action: 'set',
            time: importRecord.time,
            typeId,
            quantity: importRecord.quantity
          });
          break;
        }
        case 'take': {
          latestQuantity -= importRecord.takeQuantity;
          quantityRecords.push({
            action: 'take',
            time: importRecord.time,
            typeId,
            memberId: importRecord.memberId,
            quantity: latestQuantity,
            takeQuantity: importRecord.takeQuantity
          });
          break;
        }
        default: {
          throw new Error(`Unknown action: ${importRecord!.action}`);
        }
      }
    }

    const promises: Array<Promise<unknown>> = [];
    promises.push(this._typeCollection.updateOne({
      typeId
    }, {
      $set: {
        currentQuantity: latestQuantity,
        versionId: new ObjectId()
      }
    }));
    if (quantityRecords.length > 0) {
      promises.push(this._quantityRecordCollection.insertMany(quantityRecords));
    }
    await Promise.all(promises);
  }


  private async _normalizeFilterTypeIds(
    filterTypeIds: ReadonlyArray<string> | null
  ): Promise<ReadonlyArray<string>> {
    if (filterTypeIds !== null) {
      const notFoundTypeIds = await this._hasAllTypes(filterTypeIds);
      if (notFoundTypeIds.length > 0) {
        throw new ExpendableInventoryTypeNotFoundError(notFoundTypeIds);
      }
      return filterTypeIds;
    }
    const types = await this.getTypes();
    return types.map((type) => type.typeId);
  }

  private async _getLatestQuantityRecordsBefore(opts: {
    readonly typeIds: ReadonlyArray<string>,
    readonly time: Date,
    readonly range: 'lt' | 'lte'
  }): Promise<Map<string, number>> {
    const {
      typeIds,
      time,
      range
    } = opts;

    /* eslint-disable @typescript-eslint/indent */
    const result = await this._quantityRecordCollection
      .aggregate<{ doc: ExpendableInventoryQuantityRecord }>([
        {
          $match: {
            typeId: {
              $in: typeIds
            },
            time: {
              [`$${range}`]: time
            }
          }
        },
        {
          $sort: {
            typeId: -1,
            time: -1,
            _id: -1
          }
        },
        {
          $group: {
            _id: '$typeId',
            doc: {
              $first: '$$ROOT'
            }
          }
        }
      ])
      .toArray();
    /* eslint-enable @typescript-eslint/indent */
    const resultMap = new Map(result.map(({ doc }) => [doc.typeId, doc.quantity]));
    return new Map(typeIds.map((typeId) => [typeId, resultMap.get(typeId) ?? 0]));
  }


  public async getQuantity(opts: {
    readonly time: Date;
    readonly filterTypeIds?: ReadonlyArray<string> | null;
    readonly groupBy: ExpendableInventoryQuantityGroupBy;
  }): Promise<ExpendableInventoryQuantity> {
    const {
      time,
      filterTypeIds = null,
      groupBy
    } = opts;

    const history = await this.getQuantityHistory({
      fromTime: time,
      toTime: addMilliseconds(time, 1),
      timeStepMs: 1,
      filterTypeIds,
      groupBy,
      countType: 'quantity'
    });

    return {
      groups: history.groups,
      values: history.values.map((groupValues) => groupValues[0])
    };
  }

  public async getQuantityHistory(opts: {
    readonly fromTime: Date;
    readonly toTime: Date;
    readonly timeStepMs: number;
    readonly filterTypeIds: ReadonlyArray<string> | null;
    readonly groupBy: ExpendableInventoryQuantityHistoryGroupBy;
    readonly countType: ExpendableInventoryQuantityHistoryCountType
  }): Promise<ExpendableInventoryQuantityHistory> {
    const {
      fromTime,
      toTime,
      timeStepMs,
      filterTypeIds,
      groupBy,
      countType
    } = opts;

    const typeIds = await this._normalizeFilterTypeIds(filterTypeIds);
    const [
      quantityRecords,
      initialQuantityMap
    ] = await Promise.all([
      this._quantityRecordCollection
        .find(
          {
            ...filterTypeIds === null ? {} : {
              typeId: {
                $in: filterTypeIds.slice()
              }
            },
            time: {
              $gte: fromTime,
              $lt: toTime
            }
          }, {
            sort: {
              time: 1,
              _id: 1
            }
          }
        )
        .toArray(),
      this._getLatestQuantityRecordsBefore({
        typeIds,
        time: fromTime,
        range: 'lt'
      })
    ]);

    const timeSpans = timeSpanRange(fromTime, toTime, timeStepMs);
    const timeSpanRecords: Array<ReadonlyArray<ExpendableInventoryQuantityRecord>> = [];
    const timeSpanQuantityMaps: Array<ReadonlyMap<string, number>> = [];

    const currentQuantityMap = new Map(initialQuantityMap);
    let i = 0;
    for (const [, periodEndTime] of timeSpans) {
      const periodRecords: Array<ExpendableInventoryQuantityRecord> = [];
      while (i < quantityRecords.length && quantityRecords[i].time <= periodEndTime) {
        currentQuantityMap.set(quantityRecords[i].typeId, quantityRecords[i].quantity);
        periodRecords.push(quantityRecords[i]);
        i += 1;
      }
      timeSpanRecords.push(periodRecords);
      timeSpanQuantityMaps.push(new Map(currentQuantityMap));
    }

    let groups: ReadonlyArray<string>;
    // eslint-disable-next-line max-len
    let groupedTimeSpanQuantities: ReadonlyArray<Array<number>> | null = null; // for countType=quantity
    // eslint-disable-next-line max-len
    let groupedTimeSpanRecords: ReadonlyArray<Array<ReadonlyArray<ExpendableInventoryQuantityRecord>>>;
    switch (groupBy) {
      case null: {
        groups = ['total'];
        groupedTimeSpanQuantities = [
          timeSpanQuantityMaps.map((timeSpanQuantityMap) =>
            Array.from(timeSpanQuantityMap.values()).reduce((s, a) => s + a, 0))
        ];
        groupedTimeSpanRecords = [
          timeSpanRecords
        ];
        break;
      }
      case 'type': {
        groups = typeIds;
        groupedTimeSpanQuantities = typeIds.map((typeId) =>
          timeSpanQuantityMaps.map((timeSpanQuantityMap) =>
            timeSpanQuantityMap.get(typeId)!));
        groupedTimeSpanRecords = typeIds.map((typeId) =>
          timeSpanRecords.map((periodRecords) =>
            periodRecords.filter((periodRecord) => periodRecord.typeId === typeId)));
        break;
      }
      case 'member': {
        groups = Array.from(new Set(timeSpanRecords.flatMap((periodRecords) =>
          periodRecords
            .filter((periodRecord): periodRecord is ExpendableInventoryQuantityTakeRecord => periodRecord.action === 'take')
            .map((periodRecord) => periodRecord.memberId))));
        groupedTimeSpanQuantities = null;
        groupedTimeSpanRecords = groups.map((memberId) =>
          timeSpanRecords.map((periodRecords) =>
            periodRecords.filter((periodRecord) => (
              periodRecord.action === 'take'
              && periodRecord.memberId === memberId
            ))));
        break;
      }
      case 'department':
      case 'typeOfStudy':
      case 'studyProgramme':
      case 'yearOfStudy':
      case 'affiliatedStudentInterestGroup': {
        const memberList = await this._memberCollection
          .find({
            memberId: {
              $in: Array.from(new Set(
                timeSpanRecords.flatMap((periodRecords) => periodRecords
                  .filter((periodRecord): periodRecord is ExpendableInventoryQuantityTakeRecord => periodRecord.action === 'take')
                  .map((periodRecord) => periodRecord.memberId))
              ))
            }
          })
          .toArray();
        const memberMap = new Map(memberList.map((m) => [m.memberId, m]));

        groups = Array.from(new Set(memberList.map((member) => member[groupBy])));
        groupedTimeSpanQuantities = null;
        groupedTimeSpanRecords = groups.map((group) =>
          timeSpanRecords.map((periodRecords) =>
            periodRecords.filter((periodRecord) => (
              periodRecord.action === 'take'
              && memberMap.get(periodRecord.memberId)?.[groupBy] === group
            ))));
        break;
      }
      default: {
        throw new Error(`Unsupported groupBy: ${groupBy}`);
      }
    }

    let values: ReadonlyArray<Array<number>>;
    switch (countType) {
      case 'quantity': {
        if (groupedTimeSpanQuantities === null) {
          throw new Error('countType=quantity can only be used with groupBy=null|type');
        }
        values = groupedTimeSpanQuantities;
        break;
      }
      case 'take': {
        values = groupedTimeSpanRecords.map((groupTimeSpanRecords) =>
          groupTimeSpanRecords.map((periodRecords) =>
            periodRecords.filter((periodRecord) => periodRecord.action === 'take').length));
        break;
      }
      case 'uniqueTake': {
        values = groupedTimeSpanRecords.map((groupTimeSpanRecords) =>
          groupTimeSpanRecords.map((periodRecords) => {
            const acquiredMemberIds = new Set<string>();
            for (const periodRecord of periodRecords) {
              if (periodRecord.action === 'take') {
                acquiredMemberIds.add(periodRecord.memberId);
              }
            }
            return acquiredMemberIds.size;
          }));
        break;
      }
      default: {
        throw new Error(`Unsupported count type: ${countType}`);
      }
    }

    return {
      timeSpans,
      groups,
      values
    };
  }

  public async getQuantityForecast(opts: {
    readonly fromTime: Date;
    readonly timeStepMs: number;
    readonly filterTypeIds: ReadonlyArray<string> | null;
    readonly groupBy: ExpendableInventoryQuantityForecastGroupBy;
    readonly countType: ExpendableInventoryQuantityForecastCountType
  }): Promise<ExpendableInventoryQuantityForecast> {
    const {
      fromTime,
      timeStepMs,
      filterTypeIds,
      groupBy,
      countType
    } = opts;

    const historyToTime = fromTime;
    const historyFromTime = subMilliseconds(fromTime, timeStepMs * 14 * 24 * 2);
    const history = await this.getQuantityHistory({
      fromTime: historyFromTime,
      toTime: historyToTime,
      timeStepMs,
      filterTypeIds,
      groupBy,
      countType
    });

    const forecast = await this._historyForecastService.predict(history.values);
    const forecastTimeSpans = timeSpanRepeat(fromTime, timeStepMs, 2 * 24 * 2);

    return {
      timeSpans: forecastTimeSpans,
      groups: history.groups,
      values: forecast
    };
  }
}
