import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { ObjectId } from 'mongodb';

import { MachineInstanceCollection, MachineInstance } from '../db/machine-instance';
import { MachineMemberRecord, MachineMemberRecordCollection } from '../db/machine-member-record';
import { MachineType, MachineTypeCollection } from '../db/machine-type';
import { MemberCollection } from '../db/member';
import {
  ReadonlyMap2, Map2, setMap2,
  copyMap2, getMap2
} from '../utils/map';

import { HistoryForecastService } from './history-forecast';
import { timeSpanRange } from './time';


export class MachineTypeNotFoundError extends Error {
  public constructor(typeIds: ReadonlyArray<string>) {
    super(`Cannot find machine with type id: ${typeIds.join(', ')}`);
  }
}

export class MachineInstanceNotFoundError extends Error {
  public constructor(typeId: string, instanceIds: ReadonlyArray<string>) {
    super(`Cannot find machine with type id ${typeId} and instance id: ${instanceIds.join(', ')}`);
  }
}


export {
  MachineType,
  MachineInstance,
  MachineMemberRecord
};


export interface MachineImportInstanceAccessRecord {
  readonly time: Date;
  readonly action: 'acquire' | 'release';
  readonly memberId: string;
}


export type MachineMemberCountHistoryGroupBy =
  null
  | 'type'
  | 'instance'
  | 'member'
  | 'department'
  | 'typeOfStudy'
  | 'studyProgramme'
  | 'yearOfStudy'
  | 'affiliatedStudentInterestGroup';

export type MachineMemberCountHistoryCountType =
  'acquire'
  | 'uniqueAcquire'
  | 'release'
  | 'uniqueRelease'
  | 'use'
  | 'uniqueUse';

export interface MachineMemberCountHistory {
  readonly timeSpans: ReadonlyArray<readonly [Date, Date]>;
  readonly groups: ReadonlyArray<string>;
  readonly values: ReadonlyArray<ReadonlyArray<number>>;
}


export type MachineMemberCountForecastGroupBy =
  MachineMemberCountHistoryGroupBy;

export type MachineMemberCountForecastCountType =
  MachineMemberCountHistoryCountType;

export type MachineMemberCountForecast =
  MachineMemberCountHistory;


@injectableConstructor({
  machineTypeCollection: MachineTypeCollection,
  machineInstanceCollection: MachineInstanceCollection,
  machineAccessRecordCollection: MachineMemberRecordCollection,
  memberCollection: MemberCollection,
  historyForecastService: HistoryForecastService
})
@singleton()
export class MachineService {
  private readonly _typeCollection: MachineTypeCollection;
  private readonly _instanceCollection: MachineInstanceCollection;
  private readonly _memberRecordCollection: MachineMemberRecordCollection;

  private readonly _memberCollection: MemberCollection;
  private readonly _historyForecastService: HistoryForecastService;

  public constructor(deps: {
    machineTypeCollection: MachineTypeCollection;
    machineInstanceCollection: MachineInstanceCollection;
    machineAccessRecordCollection: MachineMemberRecordCollection;
    memberCollection: MemberCollection;
    historyForecastService: HistoryForecastService;
  }) {
    ({
      machineTypeCollection: this._typeCollection,
      machineInstanceCollection: this._instanceCollection,
      machineAccessRecordCollection: this._memberRecordCollection,
      memberCollection: this._memberCollection,
      historyForecastService: this._historyForecastService
    } = deps);
  }


  public async getTypes(): Promise<Array<MachineType>> {
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

  public async importTypes(types: ReadonlyArray<Pick<MachineType, 'typeId' | 'typeName'>>): Promise<void> {
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


  public async getInstances(typeId: string): Promise<ReadonlyArray<MachineInstance>> {
    return this._instanceCollection.find({ typeId }).toArray();
  }

  private async _hasInstance(typeId: string, instanceId: string): Promise<boolean> {
    const count = await this._instanceCollection
      .countDocuments({ typeId, instanceId }, { limit: 1 });
    return count >= 1;
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
    instances: ReadonlyArray<Pick<MachineInstance, 'instanceId' | 'instanceName'>>
  ): Promise<void> {
    if (!await this._hasType(typeId)) {
      throw new MachineTypeNotFoundError([typeId]);
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
                instanceName: instance.instanceName,
                currentMemberIds: [],
                versionId: new ObjectId()
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
    importRecords: ReadonlyArray<MachineImportInstanceAccessRecord>
  ): Promise<void> {
    if (!await this._hasInstance(typeId, instanceId)) {
      throw new MachineInstanceNotFoundError(typeId, [instanceId]);
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

    const latestMemberRecord = await this._memberRecordCollection.findOne({
      typeId,
      instanceId
    }, {
      sort: {
        time: -1,
        _id: -1
      }
    });

    let latestMemberIds = latestMemberRecord === null ? [] : latestMemberRecord.memberIds;
    const memberRecords: Array<Omit<MachineMemberRecord, '_id'>> = [];

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

      memberRecords.push({
        typeId,
        instanceId,
        time: importRecord.time,
        action: importRecord.action,
        actionMemberId: importRecord.memberId,
        memberIds: latestMemberIds
      });
    }

    const promises: Array<Promise<unknown>> = [];
    promises.push(this._instanceCollection.updateOne({
      typeId,
      instanceId
    }, {
      $set: {
        currentMemberIds: latestMemberIds,
        versionId: new ObjectId()
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
    readonly groupBy: MachineMemberCountHistoryGroupBy;
    readonly countType: MachineMemberCountHistoryCountType
  }): Promise<MachineMemberCountHistory> {
    type MemberRecordMap = ReadonlyMap2<string, string, MachineMemberRecord>;

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

    if (filterTypeIds !== null) {
      const notFoundTypeIds = await this._hasAllTypes(filterTypeIds);
      if (notFoundTypeIds.length > 0) {
        throw new MachineTypeNotFoundError(notFoundTypeIds);
      }
    }

    if (filterTypeIds !== null && filterTypeIds.length === 1) {
      if (filterInstanceIds !== null) {
        const notFoundInstanceIds =
          await this._hasAllInstances(filterTypeIds[0], filterInstanceIds);
        if (notFoundInstanceIds.length > 0) {
          throw new MachineInstanceNotFoundError(filterTypeIds[0], notFoundInstanceIds);
        }
      }
    }

    const [
      memberRecords,
      initialMemberRecords
    ] = await Promise.all([
      this._memberRecordCollection
        .find(
          {
            ...filterTypeIds === null ? {} : {
              typeId: {
                $in: filterTypeIds.slice()
              }
            },
            ...filterInstanceIds === null ? {} : {
              instanceId: {
                $in: filterInstanceIds.slice()
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
      (async (): Promise<MemberRecordMap> => {
        const records = await this._memberRecordCollection
          .aggregate([
            {
              $match: {
                ...filterTypeIds === null ? {} : {
                  typeId: {
                    $in: filterTypeIds.slice()
                  }
                },
                ...filterInstanceIds === null ? {} : {
                  instanceId: {
                    $in: filterInstanceIds.slice()
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
                _id: -1
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

        const map: Map2<string, string, MachineMemberRecord> = new Map();
        for (const result of records) {
          setMap2(map, result.typeId, result.instanceId, result);
        }
        return map;
      })()
    ]);

    const timeSpans = timeSpanRange(fromTime, toTime, timeStepMs);
    const timeSpansInitialRecords: Array<MemberRecordMap> = [];
    const timeSpansRecords: Array<ReadonlyArray<MachineMemberRecord>> = [];
    const timeSpansLatestRecords: Array<MemberRecordMap> = [];

    const currentMemberRecords = copyMap2(initialMemberRecords);
    let i = 0;
    for (const [, timeSpanEndTime] of timeSpans) {
      timeSpansInitialRecords.push(
        copyMap2<string, string, MachineMemberRecord>(currentMemberRecords)
      );

      const timeSpanRecords: Array<MachineMemberRecord> = [];
      while (i < memberRecords.length && memberRecords[i].time <= timeSpanEndTime) {
        setMap2(
          currentMemberRecords,
          memberRecords[i].typeId,
          memberRecords[i].instanceId,
          memberRecords[i]
        );
        timeSpanRecords.push(memberRecords[i]);
        i += 1;
      }
      timeSpansRecords.push(timeSpanRecords);

      timeSpansLatestRecords.push(
        copyMap2<string, string, MachineMemberRecord>(currentMemberRecords)
      );
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

          const usingMemberIds: Map2<string, string, Array<string>> = new Map();
          const usedMemberStats: Array<Stat> = [];

          for (const instanceRecords of initialRecords.values()) {
            for (const record of instanceRecords.values()) {
              setMap2(usingMemberIds, record.typeId, record.instanceId, record.memberIds);
              usedMemberStats.push(...record.memberIds.map((memberId) => ({
                typeId: record.typeId,
                instanceId: record.instanceId,
                memberId
              })));
            }
          }

          for (const record of timeSpanRecords) {
            switch (record.action) {
              case 'acquire': {
                let ids: Array<string> | undefined =
                  getMap2(usingMemberIds, record.typeId, record.instanceId);
                if (ids === undefined) {
                  ids = [];
                  setMap2(usingMemberIds, record.typeId, record.instanceId, ids);
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
                const ids: Array<string> | undefined =
                  getMap2(usingMemberIds, record.typeId, record.instanceId);
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
        if (filterTypeIds !== null) {
          groups = filterTypeIds;
        } else {
          groups = Array.from(new Set(
            timeSpansStats.flatMap((stats) => stats.flatMap((stat) => stat.memberId))
          ));
        }
        groupedTimeSpansStats = groups.map((typeId) =>
          timeSpansStats.map((stats) =>
            stats.filter((stat) => stat.typeId === typeId)));
        break;
      }
      case 'instance': {
        if (filterInstanceIds !== null) {
          groups = filterInstanceIds;
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
    readonly groupBy: MachineMemberCountForecastGroupBy;
    readonly countType: MachineMemberCountForecastCountType
  }): Promise<MachineMemberCountForecast> {
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
    const forecastTimeSpans = timeSpanRange(forecastFromTime, forecastToTime, forecastTimeStepMs);
    const forecast = history.values.length > 0
      ? await this._historyForecastService.predict(history.values)
      : [];

    return {
      timeSpans: forecastTimeSpans,
      groups: history.groups,
      values: forecast
    };
  }
}
