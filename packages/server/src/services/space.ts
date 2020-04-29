import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { addDays } from 'date-fns';
import { ObjectId } from 'mongodb';

import { MemberCollection } from '../db/member';
import { Space, SpaceCollection } from '../db/space';
import { SpaceMemberRecordCollection, SpaceMemberRecord } from '../db/space-member-record';

import { CorrelationService, CorrelationResult } from './correlation';
import { HistoryForecastService } from './history-forecast';
import { timeSpanRange } from './time';


export class SpaceNotFoundError extends Error {
  public constructor(spaceIds: ReadonlyArray<string>) {
    super(`Cannot find space with id: ${spaceIds.join(',')}`);
  }
}


export {
  Space,
  SpaceMemberRecord
};


export interface SpaceImportAccessRecord {
  readonly time: Date;
  readonly action: 'enter' | 'exit';
  readonly memberId: string;
}


export type SpaceMemberCountHistoryGroupBy =
  null
  | 'space'
  | 'member'
  | 'department'
  | 'typeOfStudy'
  | 'studyProgramme'
  | 'yearOfStudy'
  | 'affiliatedStudentInterestGroup';

export type SpaceMemberCountHistoryCountType =
  'enter'
  | 'uniqueEnter'
  | 'exit'
  | 'uniqueExit'
  | 'stay'
  | 'uniqueStay';

export interface SpaceMemberCountHistory {
  readonly timeSpans: ReadonlyArray<readonly [Date, Date]>;
  readonly groups: ReadonlyArray<string>;
  readonly values: ReadonlyArray<ReadonlyArray<number>>;
}


export type SpaceMemberCountForecastGroupBy =
  SpaceMemberCountHistoryGroupBy;

export type SpaceMemberCountForecastCountType =
  SpaceMemberCountHistoryCountType;

export type SpaceMemberCountForecast =
  SpaceMemberCountHistory;


@injectableConstructor({
  spaceCollection: SpaceCollection,
  spaceMemberRecordCollection: SpaceMemberRecordCollection,
  memberCollection: MemberCollection,
  correlationService: CorrelationService,
  historyForecastService: HistoryForecastService
})
@singleton()
export class SpaceService {
  private readonly _spaceCollection: SpaceCollection;
  private readonly _memberRecordCollection: SpaceMemberRecordCollection;

  private readonly _memberCollection: MemberCollection;
  private readonly _correlationService: CorrelationService;
  private readonly _historyForecastService: HistoryForecastService;

  public constructor(deps: {
    spaceCollection: SpaceCollection;
    spaceMemberRecordCollection: SpaceMemberRecordCollection,
    memberCollection: MemberCollection,
    correlationService: CorrelationService,
    historyForecastService: HistoryForecastService
  }) {
    ({
      spaceCollection: this._spaceCollection,
      spaceMemberRecordCollection: this._memberRecordCollection,
      memberCollection: this._memberCollection,
      correlationService: this._correlationService,
      historyForecastService: this._historyForecastService
    } = deps);
  }


  public async getSpaces(): Promise<ReadonlyArray<Space>> {
    return this._spaceCollection.find({}).toArray();
  }

  private async _hasSpace(spaceId: string): Promise<boolean> {
    const count = await this._spaceCollection
      .countDocuments({ spaceId }, { limit: 1 });
    return count >= 1;
  }

  private async _hasAllSpaces(spaceIds: ReadonlyArray<string>): Promise<ReadonlyArray<string>> {
    const matchedSpace = await this._spaceCollection.find({
      spaceId: {
        $in: spaceIds.slice()
      }
    }).toArray();
    const matchedSpaceIds = new Set(matchedSpace.map((space) => space.spaceId));
    return spaceIds.filter((spaceId) => !matchedSpaceIds.has(spaceId));
  }

  public async importSpaces(spaces: ReadonlyArray<Pick<Space, 'spaceId' | 'spaceName' | 'spaceCapacity'>>): Promise<void> {
    if (spaces.length === 0) return;
    await this._spaceCollection
      .bulkWrite(
        spaces.map((space) => ({
          updateOne: {
            filter: { spaceId: space.spaceId },
            update: {
              $set: {
                spaceName: space.spaceName,
                spaceCapacity: space.spaceCapacity,
                versionId: new ObjectId()
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


  public async importAccessRecords(
    spaceId: string,
    deleteFromTime: Date | null,
    importRecords: ReadonlyArray<SpaceImportAccessRecord>
  ): Promise<void> {
    if (!await this._hasSpace(spaceId)) {
      throw new SpaceNotFoundError([spaceId]);
    }

    await this._memberRecordCollection.deleteMany({
      spaceId,
      ...deleteFromTime === null ? {} : {
        time: {
          $gte: deleteFromTime
        }
      }
    });

    const latestMemberRecord = await this._memberRecordCollection.findOne({
      spaceId
    }, {
      sort: {
        time: -1,
        _id: -1
      }
    });

    let latestMemberIds = latestMemberRecord === null ? [] : latestMemberRecord.memberIds;
    const memberRecords: Array<Omit<SpaceMemberRecord, '_id'>> = [];

    for (const importRecord of importRecords) {
      switch (importRecord.action) {
        case 'enter': {
          if (!latestMemberIds.includes(importRecord.memberId)) {
            latestMemberIds = [...latestMemberIds, importRecord.memberId];
          }
          break;
        }
        case 'exit': {
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
        spaceId,
        time: importRecord.time,
        action: importRecord.action,
        actionMemberId: importRecord.memberId,
        memberIds: latestMemberIds
      });
    }

    const promises: Array<Promise<unknown>> = [];
    promises.push(this._spaceCollection.updateOne({
      spaceId
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
    readonly filterSpaceIds: ReadonlyArray<string> | null;
    readonly countType: SpaceMemberCountHistoryCountType;
    readonly groupBy: SpaceMemberCountHistoryGroupBy | null;
  }): Promise<SpaceMemberCountHistory> {
    type MemberRecordMap = ReadonlyMap<string, SpaceMemberRecord>;

    const {
      fromTime,
      toTime,
      timeStepMs,
      filterSpaceIds,
      groupBy,
      countType
    } = opts;

    if (filterSpaceIds !== null) {
      const notFoundSpaceIds = await this._hasAllSpaces(filterSpaceIds);
      if (notFoundSpaceIds.length > 0) {
        throw new SpaceNotFoundError(notFoundSpaceIds);
      }
    }

    const [
      memberRecords,
      initialMemberRecords
    ] = await Promise.all([
      this._memberRecordCollection
        .find(
          {
            ...filterSpaceIds === null ? {} : {
              spaceId: {
                $in: filterSpaceIds.slice()
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
                ...filterSpaceIds === null ? {} : {
                  spaceId: {
                    $in: filterSpaceIds.slice()
                  }
                },
                time: {
                  $lt: fromTime
                }
              }
            },
            {
              $sort: {
                spaceId: -1,
                time: -1,
                _id: -1
              }
            },
            {
              $group: {
                _id: '$spaceId',
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

        const map: Map<string, SpaceMemberRecord> = new Map();
        for (const result of records) {
          map.set(result.spaceId, result);
        }
        return map;
      })()
    ]);

    const timeSpans = timeSpanRange(fromTime, toTime, timeStepMs);
    const timeSpansInitialRecords: Array<MemberRecordMap> = [];
    const timeSpansRecords: Array<ReadonlyArray<SpaceMemberRecord>> = [];
    const timeSpansLatestRecords: Array<MemberRecordMap> = [];

    const currentMemberRecords = new Map(initialMemberRecords);
    let i = 0;
    for (const [, timeSpanEndTime] of timeSpans) {
      timeSpansInitialRecords.push(
        new Map(currentMemberRecords)
      );

      const timeSpanRecords: Array<SpaceMemberRecord> = [];
      while (i < memberRecords.length && memberRecords[i].time < timeSpanEndTime) {
        currentMemberRecords.set(memberRecords[i].spaceId, memberRecords[i]);
        timeSpanRecords.push(memberRecords[i]);
        i += 1;
      }
      timeSpansRecords.push(timeSpanRecords);

      timeSpansLatestRecords.push(
        new Map(currentMemberRecords)
      );
    }

    interface Stat {
      readonly spaceId: string;
      readonly memberId: string;
    }
    let timeSpansStats: ReadonlyArray<ReadonlyArray<Stat>>;
    switch (countType) {
      case 'enter':
      case 'uniqueEnter': {
        timeSpansStats = timeSpansRecords.map((timeSpanRecords) =>
          timeSpanRecords
            .filter((record) => record.action === 'enter')
            .map((record) => ({
              spaceId: record.spaceId,
              memberId: record.actionMemberId
            })));
        break;
      }
      case 'exit':
      case 'uniqueExit': {
        timeSpansStats = timeSpansRecords.map((timeSpanRecords) =>
          timeSpanRecords
            .filter((record) => record.action === 'exit')
            .map((record) => ({
              spaceId: record.spaceId,
              memberId: record.actionMemberId
            })));
        break;
      }
      case 'stay':
      case 'uniqueStay': {
        timeSpansStats = timeSpansRecords.map((timeSpanRecords, t) => {
          const initialRecords = timeSpansInitialRecords[t];

          const usingMemberIds: Map<string, Array<string>> = new Map();
          const usedMemberStats: Array<Stat> = [];

          for (const record of initialRecords.values()) {
            usingMemberIds.set(record.spaceId, record.memberIds.slice());
            usedMemberStats.push(...record.memberIds.map((memberId) => ({
              spaceId: record.spaceId,
              memberId
            })));
          }

          for (const record of timeSpanRecords) {
            switch (record.action) {
              case 'enter': {
                let ids = usingMemberIds.get(record.spaceId);
                if (ids === undefined) {
                  ids = [];
                  usingMemberIds.set(record.spaceId, ids);
                }
                if (!ids.includes(record.actionMemberId)) {
                  ids.push(record.actionMemberId);
                  usedMemberStats.push({
                    spaceId: record.spaceId,
                    memberId: record.actionMemberId
                  });
                }
                break;
              }
              case 'exit': {
                const ids = usingMemberIds.get(record.spaceId);
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
      case 'space': {
        if (filterSpaceIds !== null) {
          groups = filterSpaceIds;
        } else {
          groups = Array.from(new Set(
            timeSpansStats.flatMap((stats) =>
              stats.flatMap((stat) => stat.spaceId))
          ));
        }
        groupedTimeSpansStats = groups.map((spaceId) =>
          timeSpansStats.map((stats) =>
            stats.filter((stat) => stat.spaceId === spaceId)));
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
      case 'enter':
      case 'exit':
      case 'stay': {
        values = groupedTimeSpansStats.map((groupStats) =>
          groupStats.map((stats) =>
            stats.length));
        break;
      }
      case 'uniqueEnter':
      case 'uniqueExit':
      case 'uniqueStay': {
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
    readonly filterSpaceIds: ReadonlyArray<string> | null;
    readonly countType: SpaceMemberCountForecastCountType;
    readonly groupBy: SpaceMemberCountForecastGroupBy | null;
  }): Promise<SpaceMemberCountForecast> {
    const {
      fromTime,
      filterSpaceIds,
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
      filterSpaceIds,
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

  public async getCorrelation(opts: {
    readonly fromTime: Date;
    readonly timeStepMs: number;
    readonly filterSpaceIds: ReadonlyArray<string>;
    readonly countType: SpaceMemberCountHistoryCountType;
  }): Promise<CorrelationResult> {
    const historyToTime = addDays(opts.fromTime, 14);
    const historyPromises = opts.filterSpaceIds.map((spaceId) => this.getMemberCountHistory({
      ...opts,
      toTime: historyToTime,
      filterSpaceIds: [spaceId],
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
