import { singleton, injectableConstructor } from '@innolens/resolver/lib-node';
import { addDays } from 'date-fns';
import { Long } from 'mongodb';

import { MemberCollection } from '../db/member';
import { ReusableInventoryInstanceCollection, ReusableInventoryInstance } from '../db/reusable-inventory-instance';
import { ReusableInventoryMemberRecord, ReusableInventoryMemberRecordCollection } from '../db/reusable-inventory-member-record';
import { ReusableInventoryType, ReusableInventoryTypeCollection } from '../db/reusable-inventory-type';
import { ReadonlyMap2, Map2 } from '../utils/map2';
import { Writable } from '../utils/object';

import { CorrelationService, CorrelationResult } from './correlation';
import { HistoryForecastService } from './history-forecast';
import { timeSpanRangeLegacy } from './time';


export class ReusableInventoryTypeNotFoundError extends Error {
  public constructor(typeIds: ReadonlyArray<string>) {
    super(`Cannot find reusable inventory with type id: ${typeIds.join(', ')}`);
  }
}

export class ReusableInventoryInstanceNotFoundError extends Error {
  public constructor(typeId: string, instanceIds: ReadonlyArray<string>) {
    super(`Cannot find reusable inventory with type id ${typeId} and instance id: ${instanceIds.join(', ')}`);
  }
}


export {
  ReusableInventoryType,
  ReusableInventoryInstance,
  ReusableInventoryMemberRecord
};


export interface ReusableInventoryImportInstanceAccessRecord {
  readonly time: Date;
  readonly action: 'acquire' | 'release';
  readonly memberId: string;
}


export type ReusableInventoryMemberCountHistoryGroupBy =
  null
  | 'type'
  | 'instance'
  | 'member'
  | 'department'
  | 'typeOfStudy'
  | 'studyProgramme'
  | 'yearOfStudy'
  | 'affiliatedStudentInterestGroup';

export type ReusableInventoryMemberCountHistoryCountType =
  'acquire'
  | 'uniqueAcquire'
  | 'release'
  | 'uniqueRelease'
  | 'use'
  | 'uniqueUse';

export interface ReusableInventoryMemberCountHistory {
  readonly timeSpans: ReadonlyArray<readonly [Date, Date]>;
  readonly groups: ReadonlyArray<string>;
  readonly values: ReadonlyArray<ReadonlyArray<number>>;
}


export type ReusableInventoryMemberCountForecastGroupBy =
  ReusableInventoryMemberCountHistoryGroupBy;

export type ReusableInventoryMemberCountForecastCountType =
  ReusableInventoryMemberCountHistoryCountType;

export type ReusableInventoryMemberCountForecast =
  ReusableInventoryMemberCountHistory;


@injectableConstructor({
  reusableInventoryTypeCollection: ReusableInventoryTypeCollection,
  reusableInventoryInstanceCollection: ReusableInventoryInstanceCollection,
  reusableInventoryMemberRecordCollection: ReusableInventoryMemberRecordCollection,
  memberCollection: MemberCollection,
  correlationService: CorrelationService,
  historyForecastService: HistoryForecastService
})
@singleton()
export class ReusableInventoryService {
  private readonly _typeCollection: ReusableInventoryTypeCollection;
  private readonly _instanceCollection: ReusableInventoryInstanceCollection;
  private readonly _memberRecordCollection: ReusableInventoryMemberRecordCollection;

  private readonly _memberCollection: MemberCollection;
  private readonly _correlationService: CorrelationService;
  private readonly _historyForecastService: HistoryForecastService;

  public constructor(deps: {
    reusableInventoryTypeCollection: ReusableInventoryTypeCollection;
    reusableInventoryInstanceCollection: ReusableInventoryInstanceCollection;
    reusableInventoryMemberRecordCollection: ReusableInventoryMemberRecordCollection;
    memberCollection: MemberCollection;
    correlationService: CorrelationService;
    historyForecastService: HistoryForecastService;
  }) {
    ({
      reusableInventoryTypeCollection: this._typeCollection,
      reusableInventoryInstanceCollection: this._instanceCollection,
      reusableInventoryMemberRecordCollection: this._memberRecordCollection,
      memberCollection: this._memberCollection,
      correlationService: this._correlationService,
      historyForecastService: this._historyForecastService
    } = deps);
  }


  public async getTypes(): Promise<Array<ReusableInventoryType>> {
    return this._typeCollection.find({}).toArray();
  }

  private async _hasType(typeId: string): Promise<boolean> {
    const count = await this._typeCollection.countDocuments({ typeId }, { limit: 1 });
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

  public async importTypes(
    types: ReadonlyArray<Pick<ReusableInventoryType, 'typeId' | 'typeName'>>
  ): Promise<void> {
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
                typeName: type.typeName
              }
            },
            upsert: true
          }
        })),
        { ordered: false }
      );
  }


  public async getInstances(typeId: string): Promise<ReadonlyArray<ReusableInventoryInstance>> {
    return this._instanceCollection.find({ typeId }).toArray();
  }

  private async _hasInstance(typeId: string, instanceId: string): Promise<boolean> {
    const count = await this._instanceCollection
      .countDocuments({ typeId, instanceId }, { limit: 1 });
    return count >= 1;
  }

  private async _getInstance(
    typeId: string,
    instanceId: string
  ): Promise<ReusableInventoryInstance | null> {
    const instance = await this._instanceCollection
      .findOne({ typeId, instanceId });
    if (instance !== null && typeof instance.versionId === 'number') {
      (instance as Writable<typeof instance>).versionId = Long.fromInt(instance.versionId);
    }
    return instance;
  }

  private async _hasAllInstances(
    typeId: string,
    instanceIds: ReadonlyArray<string>
  ): Promise<ReadonlyArray<string>> {
    const matchedTypes = await this._instanceCollection.find({
      typeId,
      instanceId: {
        $in: instanceIds.slice()
      }
    }).toArray();
    const matchedInstanceIds = new Set(matchedTypes.map((instance) => instance.instanceId));
    return instanceIds.filter((instanceId) => !matchedInstanceIds.has(instanceId));
  }

  public async importInstances(
    typeId: string,
    instances: ReadonlyArray<Pick<ReusableInventoryInstance, 'instanceId' | 'instanceName'>>
  ): Promise<void> {
    if (!await this._hasType(typeId)) {
      throw new ReusableInventoryTypeNotFoundError([typeId]);
    }

    if (instances.length === 0) return;
    await this._instanceCollection
      .bulkWrite(
        instances.map((instance) => ({
          updateOne: {
            filter: {
              typeId,
              instanceId: instance.instanceId
            },
            update: {
              $set: {
                instanceName: instance.instanceName
              },
              $inc: {
                versionId: Long.ONE
              },
              $setOnInsert: {
                currentMemberIds: []
              }
            },
            upsert: true
          }
        })),
        { ordered: false }
      );
  }

  public async importInstanceAccessRecords(
    typeId: string,
    instanceId: string,
    deleteFromTime: Date | null,
    importRecords: ReadonlyArray<ReusableInventoryImportInstanceAccessRecord>
  ): Promise<void> {
    const instance = await this._getInstance(typeId, instanceId);
    if (instance === null) {
      throw new ReusableInventoryInstanceNotFoundError(typeId, [instanceId]);
    }

    await this._memberRecordCollection.deleteMany({
      typeId,
      instanceId,
      ...deleteFromTime === null ? {} : {
        time: {
          $gte: deleteFromTime
        }
      }
    });

    const latestMemberRecord = await this._memberRecordCollection.findOne(
      {
        typeId,
        instanceId
      },
      {
        sort: {
          time: -1,
          versionId: -1
        }
      }
    );

    let latestMemberIds = latestMemberRecord === null ? [] : latestMemberRecord.memberIds;
    let latestVersionId = instance.versionId;
    const memberRecords: Array<Omit<ReusableInventoryMemberRecord, '_id'>> = [];

    for (const importRecord of importRecords) {
      switch (importRecord.action) {
        case 'acquire': {
          if (!latestMemberIds.includes(importRecord.memberId)) {
            latestMemberIds = [...latestMemberIds, importRecord.memberId];
          }
          break;
        }
        case 'release': {
          if (latestMemberIds.includes(importRecord.memberId)) {
            latestMemberIds = latestMemberIds.filter((id) => id !== importRecord.memberId);
          }
          break;
        }
        default: {
          throw new Error(`Unknown action: ${importRecord.action}`);
        }
      }

      latestVersionId = latestVersionId.add(Long.ONE);
      memberRecords.push({
        typeId,
        instanceId,
        time: importRecord.time,
        action: importRecord.action,
        actionMemberId: importRecord.memberId,
        memberIds: latestMemberIds,
        versionId: latestVersionId
      });
    }

    const promises: Array<Promise<unknown>> = [];
    promises.push(this._instanceCollection.updateOne({
      typeId,
      instanceId
    }, {
      $set: {
        currentMemberIds: latestMemberIds,
        versionId: latestVersionId
      }
    }));
    if (memberRecords.length > 0) {
      promises.push(this._memberRecordCollection.insertMany(memberRecords));
    }
    await Promise.all(promises);
  }


  public async getMemberCountHistory(opts: {
    readonly fromTime: Date;
    readonly toTime: Date;
    readonly timeStepMs: number;
    readonly filterTypeIds: ReadonlyArray<string> | null;
    readonly filterInstanceIds: ReadonlyArray<string> | null,
    readonly groupBy: ReusableInventoryMemberCountHistoryGroupBy;
    readonly countType: ReusableInventoryMemberCountHistoryCountType
  }): Promise<ReusableInventoryMemberCountHistory> {
    type MemberRecordMap = ReadonlyMap2<string, string, ReusableInventoryMemberRecord>;

    const {
      fromTime,
      toTime,
      timeStepMs,
      filterTypeIds,
      filterInstanceIds,
      groupBy,
      countType
    } = opts;

    if (
      (filterTypeIds === null || filterTypeIds.length !== 1)
      && filterInstanceIds !== null
    ) {
      throw new TypeError('Invalid combination of arguments: filterInstanceIds must be used with one filterTypeId');
    }

    let queryTypeIds: ReadonlyArray<string> | null = null;
    if (filterTypeIds !== null) {
      const notFoundTypeIds = await this._hasAllTypes(filterTypeIds);
      if (notFoundTypeIds.length > 0) {
        throw new ReusableInventoryTypeNotFoundError(notFoundTypeIds);
      }
      queryTypeIds = filterTypeIds;
    }

    let queryInstanceIds: ReadonlyArray<string> | null = null;
    if (queryTypeIds !== null && queryTypeIds.length === 1) {
      if (filterInstanceIds !== null) {
        const notFoundInstanceIds =
          await this._hasAllInstances(queryTypeIds[0], filterInstanceIds);
        if (notFoundInstanceIds.length > 0) {
          throw new ReusableInventoryInstanceNotFoundError(queryTypeIds[0], notFoundInstanceIds);
        }
        queryInstanceIds = filterInstanceIds;
      }
    }

    const [
      memberRecords,
      initialMemberRecords
    ] = await Promise.all([
      this._memberRecordCollection
        .find(
          {
            ...queryTypeIds === null ? {} : {
              typeId: {
                $in: queryTypeIds.slice()
              }
            },
            ...queryInstanceIds === null ? {} : {
              instanceId: {
                $in: queryInstanceIds.slice()
              }
            },
            time: {
              $gte: fromTime,
              $lt: toTime
            }
          }, {
            sort: {
              time: 1,
              versionId: 1
            }
          }
        )
        .toArray(),
      (async (): Promise<MemberRecordMap> => {
        const records = await this._memberRecordCollection
          .aggregate([
            {
              $match: {
                ...queryTypeIds === null ? {} : {
                  typeId: {
                    $in: queryTypeIds.slice()
                  }
                },
                ...queryInstanceIds === null ? {} : {
                  instanceId: {
                    $in: queryInstanceIds.slice()
                  }
                },
                time: {
                  $lt: fromTime
                }
              }
            },
            {
              $sort: {
                typeId: -1,
                instanceId: -1,
                time: -1,
                versionId: -1
              }
            },
            {
              $group: {
                _id: {
                  typeId: '$typeId',
                  instanceId: '$instanceId'
                },
                doc: {
                  $first: '$$ROOT'
                }
              }
            },
            {
              $replaceRoot: {
                newRoot: '$doc'
              }
            }
          ])
          .toArray();

        const map: Map2<string, string, ReusableInventoryMemberRecord> = new Map2();
        for (const result of records) {
          map.set(result.typeId, result.instanceId, result);
        }
        return map;
      })()
    ]);

    const timeSpans = timeSpanRangeLegacy(fromTime, toTime, timeStepMs);
    const timeSpansInitialRecords: Array<MemberRecordMap> = [];
    const timeSpansRecords: Array<ReadonlyArray<ReusableInventoryMemberRecord>> = [];
    const timeSpansLatestRecords: Array<MemberRecordMap> = [];

    const currentMemberRecords = new Map2(initialMemberRecords);
    let i = 0;
    for (const [, timeSpanEndTime] of timeSpans) {
      timeSpansInitialRecords.push(new Map2(currentMemberRecords));

      const timeSpanRecords: Array<ReusableInventoryMemberRecord> = [];
      while (i < memberRecords.length && memberRecords[i].time < timeSpanEndTime) {
        currentMemberRecords.set(
          memberRecords[i].typeId,
          memberRecords[i].instanceId,
          memberRecords[i]
        );
        timeSpanRecords.push(memberRecords[i]);
        i += 1;
      }
      timeSpansRecords.push(timeSpanRecords);

      timeSpansLatestRecords.push(new Map2(currentMemberRecords));
    }

    interface Stat {
      readonly typeId: string;
      readonly instanceId: string;
      readonly memberId: string;
    }
    let timeSpansStats: ReadonlyArray<ReadonlyArray<Stat>>;
    switch (countType) {
      case 'acquire':
      case 'uniqueAcquire': {
        timeSpansStats = timeSpansRecords.map((timeSpanRecords) =>
          timeSpanRecords
            .filter((record) => record.action === 'acquire')
            .map((record) => ({
              typeId: record.typeId,
              instanceId: record.instanceId,
              memberId: record.actionMemberId
            })));
        break;
      }
      case 'release':
      case 'uniqueRelease': {
        timeSpansStats = timeSpansRecords.map((timeSpanRecords) =>
          timeSpanRecords
            .filter((record) => record.action === 'release')
            .map((record) => ({
              typeId: record.typeId,
              instanceId: record.instanceId,
              memberId: record.actionMemberId
            })));
        break;
      }
      case 'use':
      case 'uniqueUse': {
        timeSpansStats = timeSpansRecords.map((timeSpanRecords, t) => {
          const initialRecords = timeSpansInitialRecords[t];

          const usingMemberIds: Map2<string, string, Array<string>> = new Map2();
          const usedMemberStats: Array<Stat> = [];

          for (const record of initialRecords.values()) {
            usingMemberIds.set(record.typeId, record.instanceId, record.memberIds.slice());
            usedMemberStats.push(...record.memberIds.map((memberId) => ({
              typeId: record.typeId,
              instanceId: record.instanceId,
              memberId
            })));
          }

          for (const record of timeSpanRecords) {
            switch (record.action) {
              case 'acquire': {
                let ids = usingMemberIds.get(record.typeId, record.instanceId);
                if (ids === undefined) {
                  ids = [];
                  usingMemberIds.set(record.typeId, record.instanceId, ids);
                }
                if (!ids.includes(record.actionMemberId)) {
                  ids.push(record.actionMemberId);
                  usedMemberStats.push({
                    typeId: record.typeId,
                    instanceId: record.instanceId,
                    memberId: record.actionMemberId
                  });
                }
                break;
              }
              case 'release': {
                const ids = usingMemberIds.get(record.typeId, record.instanceId);
                if (ids !== undefined && ids.includes(record.actionMemberId)) {
                  ids.splice(ids.indexOf(record.actionMemberId), 1);
                }
                break;
              }
              default: {
                const a: never = record.action;
                throw new Error(`Unsupported action: ${a}`);
              }
            }
          }

          return usedMemberStats;
        });
        break;
      }
      default: {
        const t: never = countType;
        throw new Error(`Unsupported groupBy: ${t}`);
      }
    }

    let groups: ReadonlyArray<string>;
    let groupedTimeSpansStats: ReadonlyArray<ReadonlyArray<ReadonlyArray<Stat>>>;
    switch (groupBy) {
      case null: {
        groups = ['total'];
        groupedTimeSpansStats = [
          timeSpansStats
        ];
        break;
      }
      case 'type': {
        if (queryTypeIds !== null) {
          groups = queryTypeIds;
        } else {
          groups = Array.from(new Set(
            timeSpansStats.flatMap((stats) =>
              stats.flatMap((stat) => stat.typeId))
          ));
        }
        groupedTimeSpansStats = groups.map((typeId) =>
          timeSpansStats.map((stats) =>
            stats.filter((stat) => stat.typeId === typeId)));
        break;
      }
      case 'instance': {
        if (queryInstanceIds !== null) {
          groups = queryInstanceIds;
        } else if (queryTypeIds === null || queryTypeIds.length !== 1) {
          throw new Error('groupBy=instance can be used with one filterTypeId only');
        } else {
          groups = Array.from(new Set(
            timeSpansStats.flatMap((stats) => stats.flatMap((stat) => stat.instanceId))
          ));
        }
        groupedTimeSpansStats = groups.map((instanceId) =>
          timeSpansStats.map((stats) =>
            stats.filter((stat) => stat.instanceId === instanceId)));
        break;
      }
      case 'member': {
        groups = Array.from(new Set(
          timeSpansRecords.flatMap((timeSpanRecords) =>
            timeSpanRecords.flatMap((record) => record.memberIds))
        ));
        groupedTimeSpansStats = groups.map((memberId) =>
          timeSpansStats.map((stats) =>
            stats.filter((stat) =>
              stat.memberId === memberId)));
        break;
      }
      case 'department':
      case 'typeOfStudy':
      case 'studyProgramme':
      case 'yearOfStudy':
      case 'affiliatedStudentInterestGroup': {
        const memberIds = Array.from(new Set(
          timeSpansRecords.flatMap((timeSpanRecords) =>
            timeSpanRecords.flatMap((record) => record.memberIds))
        ));
        const memberList = await this._memberCollection
          .find({
            memberId: {
              $in: memberIds
            }
          })
          .toArray();
        const memberMap = new Map(memberList.map((m) => [m.memberId, m]));

        groups = Array.from(new Set(memberList.map((member) => member[groupBy])));
        groupedTimeSpansStats = groups.map((memberId) =>
          timeSpansStats.map((stats) =>
            stats.filter((stat) =>
              memberMap.get(stat.memberId)?.[groupBy] === memberId)));
        break;
      }
      default: {
        throw new Error(`Unsupported groupBy: ${groupBy}`);
      }
    }

    let values: ReadonlyArray<ReadonlyArray<number>>;
    switch (countType) {
      case 'acquire':
      case 'release':
      case 'use': {
        values = groupedTimeSpansStats.map((groupStats) =>
          groupStats.map((stats) =>
            stats.length));
        break;
      }
      case 'uniqueAcquire':
      case 'uniqueRelease':
      case 'uniqueUse': {
        values = groupedTimeSpansStats.map((groupStats) =>
          groupStats.map((stats) =>
            new Set(stats.map((stat) => stat.memberId)).size));
        break;
      }
      default: {
        const t: never = countType;
        throw new Error(`Unsupported groupBy: ${t}`);
      }
    }

    return {
      timeSpans,
      groups,
      values
    };
  }

  public async getMemberCountForecast(opts: {
    readonly fromTime: Date;
    readonly filterTypeIds: ReadonlyArray<string> | null;
    readonly filterInstanceIds: ReadonlyArray<string> | null;
    readonly groupBy: ReusableInventoryMemberCountForecastGroupBy;
    readonly countType: ReusableInventoryMemberCountForecastCountType
  }): Promise<ReusableInventoryMemberCountForecast> {
    const {
      fromTime,
      filterTypeIds,
      filterInstanceIds,
      groupBy,
      countType
    } = opts;

    const historyToTime = fromTime;
    const historyFromTime = this._historyForecastService.getHistoryFromTime(historyToTime);
    const historyTimeStepMs = this._historyForecastService.timeStepMs;
    const history = await this.getMemberCountHistory({
      fromTime: historyFromTime,
      toTime: historyToTime,
      timeStepMs: historyTimeStepMs,
      filterTypeIds,
      filterInstanceIds,
      groupBy,
      countType
    });

    const forecastFromTime = fromTime;
    const forecastToTime = this._historyForecastService.getForecastToTime(forecastFromTime);
    const forecastTimeStepMs = this._historyForecastService.timeStepMs;
    const forecastTimeSpans = timeSpanRangeLegacy(
      forecastFromTime,
      forecastToTime,
      forecastTimeStepMs
    );
    const forecast = history.values.length > 0
      ? await this._historyForecastService.predict(history.values)
      : [];

    return {
      timeSpans: forecastTimeSpans,
      groups: history.groups,
      values: forecast
    };
  }

  public async getCorrelation(opts: {
    readonly fromTime: Date;
    readonly timeStepMs: number;
    readonly filterTypeIds: ReadonlyArray<string>;
    readonly countType: ReusableInventoryMemberCountHistoryCountType;
  }): Promise<CorrelationResult> {
    const historyToTime = addDays(opts.fromTime, 14);
    const historyPromises = opts.filterTypeIds.map((typeId) => this.getMemberCountHistory({
      ...opts,
      toTime: historyToTime,
      filterTypeIds: [typeId],
      filterInstanceIds: null,
      groupBy: null
    }));
    const histories = await Promise.all(historyPromises);

    const correlation = await this._correlationService.correlate([
      histories[0].values[0],
      histories[1].values[0]
    ]);

    return correlation;
  }
}
