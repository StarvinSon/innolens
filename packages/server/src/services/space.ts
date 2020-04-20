import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { addMilliseconds } from 'date-fns';
import { ObjectId } from 'mongodb';

import { MemberCollection } from '../db/member';
import { Space, SpaceCollection } from '../db/space';
import { SpaceAccessRecordCollection, SpaceAccessRecord } from '../db/space-access-record';
import { SpaceMemberRecordCollection, SpaceMemberRecord } from '../db/space-member-record';
import { raceSettled } from '../utils/promise';


export class SpaceNotFoundError extends Error {
  public constructor(spaceId: string) {
    super(`Cannot find space with id: ${spaceId}`);
  }
}


export { Space, SpaceAccessRecord };


export type SpaceCountGroupBy =
  'department'
  | 'typeOfStudy'
  | 'studyProgramme'
  | 'yearOfStudy'
  | 'affiliatedStudentInterestGroup';

export type SpaceCountCountType =
  'total'
  | 'uniqueMember';

export interface SpaceCount {
  readonly groups: ReadonlyArray<string>;
  readonly counts: SpaceCountValues;
}

export interface SpaceCountValues {
  readonly [group: string]: number;
}


export type SpaceCountHistoryGroupBy = SpaceCountGroupBy;

export type SpaceCountHistoryCountType =
  'enter'
  | 'uniqueEnter'
  | 'exit'
  | 'uniqueExit'
  | 'stay'
  | 'uniqueStay';

export interface SpaceCountHistory {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<SpaceCountRecord>;
}

export interface SpaceCountRecord {
  readonly startTime: Date;
  readonly endTime: Date;
  readonly counts: SpaceCountRecordValues;
}

export interface SpaceCountRecordValues {
  readonly [group: string]: number;
}


export interface SpaceMemberHistory {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<SpaceMemberHistoryRecord>;
}

export interface SpaceMemberHistoryRecord {
  readonly startTime: Date;
  readonly endTime: Date;
  readonly groups: SpaceMemberHistoryRecordGroups;
}

export interface SpaceMemberHistoryRecordGroups {
  readonly [group: string]: ReadonlyArray<string>;
}


@injectableConstructor({
  spaceCollection: SpaceCollection,
  spaceMemberRecordCollection: SpaceMemberRecordCollection,
  spaceAccessRecordCollection: SpaceAccessRecordCollection,
  memberCollection: MemberCollection
})
@singleton()
export class SpaceService {
  private readonly _spaceCollection: SpaceCollection;
  private readonly _memberRecordCollection: SpaceMemberRecordCollection;
  private readonly _accessRecordCollection: SpaceAccessRecordCollection;
  private readonly _memberCollection: MemberCollection;

  public constructor(deps: {
    spaceCollection: SpaceCollection;
    spaceMemberRecordCollection: SpaceMemberRecordCollection,
    spaceAccessRecordCollection: SpaceAccessRecordCollection,
    memberCollection: MemberCollection
  }) {
    ({
      spaceCollection: this._spaceCollection,
      spaceMemberRecordCollection: this._memberRecordCollection,
      spaceAccessRecordCollection: this._accessRecordCollection,
      memberCollection: this._memberCollection
    } = deps);
  }

  public async importSpaces(spaces: ReadonlyArray<Omit<Space, '_id' | 'currentMemberIds' | 'versionId'>>): Promise<void> {
    await this._spaceCollection
      .bulkWrite(
        spaces.map((space) => ({
          updateOne: {
            filter: { spaceId: space.spaceId },
            update: {
              $set: {
                spaceName: space.spaceName,
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

  public async getSpaces(): Promise<Array<Space>> {
    return this._spaceCollection.find({}).toArray();
  }

  private async _hasSpace(spaceId: string): Promise<boolean> {
    const count = await this._spaceCollection
      .countDocuments({ spaceId }, { limit: 1 });
    return count >= 1;
  }

  private async _hasAllSpaces(spaceIds: ReadonlyArray<string>): Promise<string | null> {
    const promises = new Set(spaceIds.map(async (id): Promise<[string, boolean]> =>
      [id, await this._hasSpace(id)]));
    while (promises.size > 0) {
      // eslint-disable-next-line no-await-in-loop
      const result = await raceSettled(promises);
      promises.delete(result.promise);
      if (result.status === 'rejected') {
        throw result.reason;
      }
      if (!result.value[1]) {
        return result.value[0];
      }
    }
    return null;
  }


  public async importAccessRecords(
    spaceId: string,
    deleteFromTime: Date | null,
    records: ReadonlyArray<Omit<SpaceAccessRecord, '_id' | 'spaceId'>>
  ): Promise<void> {
    if (!await this._hasSpace(spaceId)) {
      throw new SpaceNotFoundError(spaceId);
    }

    await Promise.all([
      this._memberRecordCollection.deleteMany({
        spaceId,
        ...deleteFromTime === null ? {} : {
          time: {
            $gte: deleteFromTime
          }
        }
      }),
      this._accessRecordCollection.deleteMany({
        spaceId,
        ...deleteFromTime === null ? {} : {
          time: {
            $gte: deleteFromTime
          }
        }
      })
    ]);

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
    const accessRecords: Array<Omit<SpaceAccessRecord, '_id'>> = [];

    for (const record of records) {
      switch (record.action) {
        case 'enter': {
          if (!latestMemberIds.includes(record.memberId)) {
            latestMemberIds = [...latestMemberIds, record.memberId];
          }
          break;
        }
        case 'exit': {
          if (latestMemberIds.includes(record.memberId)) {
            latestMemberIds = latestMemberIds.filter((id) => id !== record.memberId);
          }
          break;
        }
        default: {
          throw new Error(`Unknown action: ${record.action}`);
        }
      }

      memberRecords.push({
        time: record.time,
        spaceId,
        memberIds: latestMemberIds,
        mode: 'access'
      });
      accessRecords.push({
        time: record.time,
        spaceId,
        memberId: record.memberId,
        action: record.action
      });
    }

    await Promise.all([
      this._spaceCollection.updateOne({
        spaceId
      }, {
        $set: {
          currentMemberIds: latestMemberIds,
          versionId: new ObjectId()
        }
      }),
      this._memberRecordCollection.bulkWrite(
        memberRecords.map((memberRecord) => ({
          insertOne: {
            document: memberRecord
          }
        })),
        { ordered: true }
      ),
      this._accessRecordCollection.bulkWrite(
        accessRecords.map((accessRecord) => ({
          insertOne: {
            document: accessRecord
          }
        })),
        { ordered: true }
      )
    ]);
  }

  public async addRecord(
    time: Date,
    spaceId: string,
    memberId: string,
    action: 'enter' | 'exit'
  ): Promise<void> {
    /* eslint-disable no-await-in-loop */
    for (let retryCount = 0; retryCount < 2; retryCount += 1) {
      const space = await this._spaceCollection.findOne({
        spaceId
      });
      if (space === null) {
        throw new SpaceNotFoundError(spaceId);
      }

      let newcurrentMemberIds: ReadonlyArray<string> | undefined;
      switch (action) {
        case 'enter': {
          if (space.currentMemberIds.includes(memberId)) {
            newcurrentMemberIds = space.currentMemberIds;
          } else {
            newcurrentMemberIds = [...space.currentMemberIds, memberId];
          }
          break;
        }
        case 'exit': {
          if (space.currentMemberIds.includes(memberId)) {
            newcurrentMemberIds = space.currentMemberIds.filter((id) => id !== memberId);
          } else {
            newcurrentMemberIds = space.currentMemberIds;
          }
          break;
        }
        default: {
          throw new Error(`Unknown action: ${action}`);
        }
      }

      const updateResult = await this._spaceCollection.findOneAndUpdate(
        {
          _id: space._id,
          versionId: space.versionId
        },
        {
          $set: {
            currentMemberIds: newcurrentMemberIds,
            versionId: new ObjectId()
          }
        },
        {
          returnOriginal: true
        }
      );
      // Race condition observed, so retry.
      // eslint-disable-next-line no-continue
      if (updateResult.value === null) continue;

      await Promise.all([
        this._memberRecordCollection.insertOne({
          time,
          spaceId,
          memberIds: newcurrentMemberIds,
          mode: 'access'
        }),
        this._accessRecordCollection.insertOne({
          time,
          spaceId,
          memberId,
          action
        })
      ]);
    }
    /* eslint-enable no-await-in-loop */
  }


  public async getMemberCount(
    time: Date,
    spaceIds: ReadonlyArray<string> | null,
    countType: SpaceCountCountType,
    groupBy: SpaceCountHistoryGroupBy | null
  ): Promise<SpaceCount> {
    let selectedSpaceIds: ReadonlyArray<string>;
    if (spaceIds !== null) {
      const notFoundSpaceId = await this._hasAllSpaces(spaceIds);
      if (notFoundSpaceId !== null) {
        throw new SpaceNotFoundError(notFoundSpaceId);
      }
      selectedSpaceIds = spaceIds;
    } else {
      const spaces = await this.getSpaces();
      selectedSpaceIds = spaces.map((space) => space.spaceId);
    }

    const spaceMemberIdsPromises = selectedSpaceIds
      .map(async (spaceId): Promise<[string, ReadonlyArray<string>]> => {
        const memberRecord = await this._memberRecordCollection.findOne({
          spaceId,
          time: {
            $lte: time
          }
        }, {
          sort: {
            time: -1,
            _id: -1
          }
        });
        const memberIds = memberRecord === null ? [] : memberRecord.memberIds;
        return [spaceId, memberIds];
      });
    const memberIds = new Map(await Promise.all(spaceMemberIdsPromises));

    const memberList = await this._memberCollection
      .find({
        memberId: {
          $in: Array.from(new Set(Array.from(memberIds.values()).flat()))
        }
      })
      .toArray();
    const memberMap = new Map(memberList.map((member) => [member.memberId, member]));

    // Create group filters
    let groupFilters: ReadonlyArray<{
      readonly name: string;
      readonly filter: (memberId: string) => boolean;
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
        const groupNames = Array.from(new Set(memberList.map((m) => m[groupBy])));
        groupFilters = groupNames.map((groupName) => ({
          name: groupName,
          filter: (memberId) => memberMap.get(memberId)?.[groupBy] === groupName
        }));
        break;
      }
      default: {
        throw new Error(`Unsupported groupBy: ${groupBy}`);
      }
    }

    let reduceMemberIds: (mIds: ReadonlyArray<string>) => ReadonlyArray<string>;
    switch (countType) {
      case 'total': {
        reduceMemberIds = (mIds) => mIds;
        break;
      }
      case 'uniqueMember': {
        reduceMemberIds = (mIds) => Array.from(new Set(mIds));
        break;
      }
      default: {
        throw new Error(`Unsupported count type: ${countType}`);
      }
    }

    const counts: Record<string, number> = {};
    for (const groupFilter of groupFilters) {
      const count = Array.from(memberIds.values())
        .flatMap((ids) => ids.slice())
        .filter((id) => groupFilter.filter(id));
      counts[groupFilter.name] = reduceMemberIds(count).length;
    }

    return {
      groups: groupFilters.map((f) => f.name),
      counts
    };
  }


  public async getMemberCountHistory(opts: {
    readonly startTime: Date;
    readonly endTime: Date;
    readonly timeStepMs: number;
    readonly filter?: {
      readonly spaceIds?: ReadonlyArray<string> | null;
      readonly memberIds?: ReadonlyArray<string> | null;
    };
    readonly countType: SpaceCountHistoryCountType;
    readonly groupBy: SpaceCountHistoryGroupBy | null;
  }): Promise<SpaceCountHistory> {
    const memberHistory = await this.getMemberHistory(opts);
    return {
      groups: memberHistory.groups,
      records: memberHistory.records.map((record) => ({
        startTime: record.startTime,
        endTime: record.endTime,
        counts: Object.fromEntries(Object.entries(record.groups)
          .map(([group, memberIds]) => [group, memberIds.length]))
      }))
    };
  }

  public async getMemberHistory(opts: {
    readonly startTime: Date;
    readonly endTime: Date;
    readonly timeStepMs: number;
    readonly filter?: {
      readonly spaceIds?: ReadonlyArray<string> | null;
      readonly memberIds?: ReadonlyArray<string> | null;
    };
    readonly countType: SpaceCountHistoryCountType;
    readonly groupBy: SpaceCountHistoryGroupBy | null;
  }): Promise<SpaceMemberHistory> {
    const {
      startTime,
      endTime,
      timeStepMs,
      filter: {
        spaceIds: filterSpaceIds = null,
        memberIds: filterMemberIds = null
      } = {},
      countType,
      groupBy
    } = opts;

    let spaceIds: ReadonlyArray<string>;
    if (filterSpaceIds !== null) {
      const notFoundSpaceId = await this._hasAllSpaces(filterSpaceIds);
      if (notFoundSpaceId !== null) {
        throw new SpaceNotFoundError(notFoundSpaceId);
      }
      spaceIds = filterSpaceIds;
    } else {
      const spaces = await this.getSpaces();
      spaceIds = spaces.map((s) => s.spaceId);
    }

    const [
      memberRecords,
      previousMemberRecords
    ] = await Promise.all([
      (async () => {
        const records = await this._memberRecordCollection
          .find(
            {
              ...filterSpaceIds === null ? {} : {
                spaceId: {
                  $in: filterSpaceIds.slice()
                }
              },
              time: {
                $gte: startTime,
                $lt: endTime
              }
            }, {
              sort: {
                time: 1,
                _id: 1
              }
            }
          )
          .toArray();

        return records.map((record) => ({
          ...record,
          memberIds: record.memberIds
            .filter((memberId) => filterMemberIds === null || filterMemberIds.includes(memberId))
        }));
      })(),
      (async (): Promise<ReadonlyMap<string, ReadonlyArray<string>>> => {
        const promises = spaceIds
          .map(async (spaceId): Promise<[string, SpaceMemberRecord | null]> => {
            const record = await this._memberRecordCollection.findOne({
              spaceId,
              time: {
                $lt: startTime
              }
            }, {
              sort: {
                time: -1,
                _id: -1
              }
            });
            return [spaceId, record];
          });
        const records = await Promise.all(promises);
        return new Map(records.map(([spaceId, record]) => {
          if (record === null) return [spaceId, []];
          return [
            spaceId,
            record.memberIds
              .filter((memberId) => filterMemberIds === null || filterMemberIds.includes(memberId))
          ];
        }));
      })()
    ]);

    const memberIds: ReadonlyArray<string> = Array.from(new Set<string>([
      ...memberRecords.flatMap((r) => r.memberIds),
      ...Array.from(previousMemberRecords.values()).flat()
    ]));
    const memberList = await this._memberCollection
      .find({
        memberId: {
          $in: memberIds.slice()
        }
      })
      .toArray();
    const memberMap = new Map(memberList.map((m) => [m.memberId, m]));

    let createMemberAccumulator: (periodStartMemberIds: ReadonlyArray<string>) => {
      add(recordMemberIds: ReadonlyArray<string>): void;
      get(): ReadonlyArray<string>;
    };
    switch (countType) {
      case 'enter':
      case 'uniqueEnter': {
        createMemberAccumulator = (periodStartMemberIds) => {
          let activeMemberIds = periodStartMemberIds;
          const enteredMemberIds: Array<string> = [];
          return {
            add: (recordMemberIds) => {
              for (const memberId of recordMemberIds) {
                if (!activeMemberIds.includes(memberId)) {
                  enteredMemberIds.push(memberId);
                }
              }
              activeMemberIds = recordMemberIds;
            },
            get: () => enteredMemberIds
          };
        };
        break;
      }
      case 'exit':
      case 'uniqueExit': {
        createMemberAccumulator = (periodStartMemberIds) => {
          let activeMemberIds = periodStartMemberIds;
          const exitedMemberIds: Array<string> = [];
          return {
            add: (recordMemberIds) => {
              for (const memberId of activeMemberIds) {
                if (!recordMemberIds.includes(memberId)) {
                  exitedMemberIds.push(memberId);
                }
              }
              activeMemberIds = recordMemberIds;
            },
            get: () => exitedMemberIds
          };
        };
        break;
      }
      case 'stay':
      case 'uniqueStay': {
        createMemberAccumulator = (periodStartMemberIds) => {
          let activeMemberIds = periodStartMemberIds;
          const stayedMemberIds = periodStartMemberIds.slice();
          return {
            add: (recordMemberIds) => {
              for (const memberId of recordMemberIds) {
                if (!activeMemberIds.includes(memberId)) {
                  stayedMemberIds.push(memberId);
                }
              }
              activeMemberIds = recordMemberIds;
            },
            get: () => stayedMemberIds
          };
        };
        break;
      }
      default: {
        throw new Error(`Unsupported count type: ${countType}`);
      }
    }

    // Create group filters
    let groupFilters: ReadonlyArray<{
      readonly name: string;
      readonly filter: (memberId: string) => boolean;
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
        const groupNames = Array.from(new Set(memberList.map((m) => m[groupBy])));
        groupFilters = groupNames.map((groupName) => ({
          name: groupName,
          filter: (memberId) => memberMap.get(memberId)?.[groupBy] === groupName
        }));
        break;
      }
      default: {
        throw new Error(`Unsupported groupBy: ${groupBy}`);
      }
    }

    let reduceAccumulatedCount: (mIds: ReadonlyArray<string>) => ReadonlyArray<string>;
    switch (countType) {
      case 'enter':
      case 'exit':
      case 'stay': {
        reduceAccumulatedCount = (mIds) => mIds;
        break;
      }
      case 'uniqueEnter':
      case 'uniqueExit':
      case 'uniqueStay': {
        reduceAccumulatedCount = (mIds) => Array.from(new Set(mIds));
        break;
      }
      default: {
        throw new Error(`Unsupported count type: ${countType}`);
      }
    }

    let i = 0;
    const records: Array<SpaceMemberHistoryRecord> = [];
    const currentMemberIds = new Map(previousMemberRecords);
    for (
      let periodStartTime = startTime, periodEndTime = addMilliseconds(periodStartTime, timeStepMs);
      periodStartTime < endTime;
      periodStartTime = periodEndTime, periodEndTime = addMilliseconds(periodEndTime, timeStepMs)
    ) {
      const memberAccumulators = new Map(Array.from(currentMemberIds)
        .map(([spaceId, ids]) => [
          spaceId,
          createMemberAccumulator(ids)
        ]));

      while (
        i < memberRecords.length
        && memberRecords[i].time < periodEndTime
      ) {
        memberAccumulators.get(memberRecords[i].spaceId)!.add(memberRecords[i].memberIds);
        currentMemberIds.set(memberRecords[i].spaceId, memberRecords[i].memberIds);
        i += 1;
      }

      const groups: Record<string, ReadonlyArray<string>> = {};
      for (const groupFilter of groupFilters) {
        const groupMemberIds = Array.from(memberAccumulators.values())
          .flatMap((a) => a.get())
          .filter((id) => groupFilter.filter(id));
        groups[groupFilter.name] = reduceAccumulatedCount(groupMemberIds);
      }

      records.push({
        startTime: periodStartTime,
        endTime: periodEndTime,
        groups
      });
    }

    return {
      groups: groupFilters.map((g) => g.name),
      records
    };
  }
}
