import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { subDays, subHours, addHours } from 'date-fns';
import { QuerySelector, FilterQuery } from 'mongodb';

import { TypedAggregationCursor } from '../db/cursor';
import { MemberCollection, Member } from '../db/member';
import { Space, SpaceCollection } from '../db/space';
import { SpaceAccessRecordCollection, SpaceAccessRecord } from '../db/space-access-record';
import { Writable } from '../utils/object';


export class SpaceNotFoundError extends Error {
  public constructor(spaceId: string) {
    super(`Cannot find space with id: ${spaceId}`);
  }
}


export { Space, SpaceAccessRecord };

export const spaceMemberCountHistoryGroupBys = [
  'department',
  'typeOfStudy',
  'studyProgramme',
  'yearOfStudy',
  'affiliatedStudentInterestGroup'
] as const;

export type SpaceMemberCountHistoryGroupBy = (typeof spaceMemberCountHistoryGroupBys)[number];

export interface SpaceMemberCountHistory {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<SpaceMemberCountRecord>;
}

export interface SpaceMemberCountRecord {
  readonly periodStartTime: Date;
  readonly periodEndTime: Date;
  readonly enterCounts: SpaceMemberCountRecordValues;
  readonly uniqueEnterCounts: SpaceMemberCountRecordValues;
  readonly exitCounts: SpaceMemberCountRecordValues;
  readonly uniqueExitCounts: SpaceMemberCountRecordValues;
  readonly stayCounts: SpaceMemberCountRecordValues;
  readonly uniqueStayCounts: SpaceMemberCountRecordValues;
}

export interface SpaceMemberCountRecordValues {
  readonly [group: string]: number;
}

@injectableConstructor({
  spaceCollection: SpaceCollection,
  spaceAccessRecordCollection: SpaceAccessRecordCollection,
  memberCollection: MemberCollection
})
@singleton()
export class SpaceService {
  private readonly _spaceCollection: SpaceCollection;
  private readonly _spaceAccessRecordCollection: SpaceAccessRecordCollection;
  private readonly _memberCollection: MemberCollection;

  public constructor(deps: {
    spaceCollection: SpaceCollection;
    spaceAccessRecordCollection: SpaceAccessRecordCollection,
    memberCollection: MemberCollection
  }) {
    ({
      spaceCollection: this._spaceCollection,
      spaceAccessRecordCollection: this._spaceAccessRecordCollection,
      memberCollection: this._memberCollection
    } = deps);
  }

  public async importSpaces(spaces: ReadonlyArray<Omit<Space, '_id'>>): Promise<void> {
    await this._spaceCollection
      .bulkWrite(
        spaces.map((space) => ({
          replaceOne: {
            filter: { spaceId: space.spaceId },
            replacement: space,
            upsert: true
          }
        })),
        { ordered: false }
      );
  }

  public async getSpaces(): Promise<Array<Space>> {
    return this._spaceCollection.find({}).toArray();
  }

  private async _findOneBySpaceId(spaceId: string): Promise<Space | null> {
    return this._spaceCollection.findOne({ spaceId });
  }

  public async importAccessRecords(
    spaceId: string,
    deleteFromTime: Date | null,
    deleteToTime: Date | null,
    records: ReadonlyArray<Omit<SpaceAccessRecord, '_id' | 'spaceId'>>
  ): Promise<void> {
    const space = await this._findOneBySpaceId(spaceId);
    if (space === null) {
      throw new SpaceNotFoundError(spaceId);
    }

    const deleteFilterQuery: FilterQuery<SpaceAccessRecord> = {
      spaceId
    };
    if (deleteFromTime !== null || deleteToTime !== null) {
      const timeQuerySelector: QuerySelector<Date> = {};
      if (deleteFromTime !== null) timeQuerySelector.$gte = deleteFromTime;
      if (deleteToTime !== null) timeQuerySelector.$lt = deleteToTime;
      deleteFilterQuery.time = timeQuerySelector;
    }
    await this._spaceAccessRecordCollection.deleteMany(deleteFilterQuery);

    await this._spaceAccessRecordCollection.insertMany(records.map((record) => ({
      ...record,
      spaceId
    })));
  }

  /**
   * Be default, the algorithm starts iterating each access records for the specific space from
   * the given `fromtime`, adds 1 to the count when a member entered the space and subtract 1
   * from the count when a member exited the space.
   *
   * Note that the precision of this algorithm depends on `fromtime`. The earlier the `fromtime`
   * is, the higher the accuracy is, in the expense of requiring more time to compute.
   *
   * Case when the algorithm is inaccurate:
   * X entered Inno Wing 7 days ago and has not exited yet. `fromtime` is set to 2 days ago.
   * Since the algorithm does not see the enter record of X, it does not know X is inside Inno
   * Wing.
   */
  public async getMemberCountHistory(
    spaceId: string,
    groupBy: SpaceMemberCountHistoryGroupBy,
    pastHours: number
  ): Promise<SpaceMemberCountHistory> {
    const endTime = new Date();
    const startTime = subHours(endTime, pastHours);

    const space = await this._findOneBySpaceId(spaceId);
    if (space === null) {
      throw new SpaceNotFoundError(spaceId);
    }

    type Record = SpaceAccessRecord & { readonly member?: Member };
    type RecordCursor = TypedAggregationCursor<Record>;
    const cursor: RecordCursor = this._spaceAccessRecordCollection.aggregate([
      {
        $match: {
          spaceId,
          time: {
            $gte: subDays(startTime, 1),
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
    ]);

    // Get spans
    interface Span {
      readonly enterTime: Date | null;
      readonly exitTime: Date | null;
      readonly member: Member;
    }
    const enteredMemberInfos = new Map<string, {
      readonly enterTime: Date;
      readonly member: Member | null;
    }>();
    const exitedMemberIds = new Set<string>();
    let spans: Array<Span> = [];
    for await (const record of cursor) {
      switch (record.action) {
        case 'enter': {
          if (!enteredMemberInfos.has(record.memberId)) {
            enteredMemberInfos.set(record.memberId, {
              enterTime: record.time,
              member: record.member ?? null
            });
          }
          break;
        }
        case 'exit': {
          const info = enteredMemberInfos.get(record.memberId);
          if (info !== undefined) {
            enteredMemberInfos.delete(record.memberId);
            exitedMemberIds.add(record.memberId);
            if (info.member !== null) {
              spans.push({
                enterTime: info.enterTime,
                exitTime: record.time,
                member: info.member
              });
            }
          } else if (!exitedMemberIds.has(record.memberId)) {
            exitedMemberIds.add(record.memberId);
            if (record.member !== undefined) {
              spans.push({
                enterTime: null,
                exitTime: record.time,
                member: record.member
              });
            }
          }
          break;
        }
        default: {
          throw new Error(`Unknown action: ${record.action}`);
        }
      }
    }
    for (const info of enteredMemberInfos.values()) {
      if (info.member !== null) {
        spans.push({
          enterTime: info.enterTime,
          exitTime: null,
          member: info.member
        });
      }
    }
    enteredMemberInfos.clear();

    // Filter spans
    spans = spans.filter((s) => (
      (s.enterTime === null || s.enterTime.valueOf() < endTime.valueOf())
      && (s.exitTime === null || s.exitTime.valueOf() > startTime.valueOf())
    ));

    // Sort spans
    spans.sort((a, b) => (
      a.enterTime === null ? -1
        : b.enterTime === null ? 1
          : a.enterTime.valueOf() - b.enterTime.valueOf()
    ));

    // Get groups
    const groupSet = new Set<string>();
    for (const span of spans) {
      groupSet.add(span.member[groupBy]);
    }
    const groups: ReadonlyArray<string> = Array.from(groupSet);

    // Get history
    let i = 0;
    const activeSpans: Array<Span> = [];
    const records: Array<SpaceMemberCountRecord> = [];
    for (
      let periodStartTime = startTime;
      periodStartTime < endTime;
      periodStartTime = addHours(periodStartTime, 1)
    ) {
      const periodEndTime = addHours(periodStartTime, 1);

      while (
        i < spans.length
        && (spans[i].enterTime === null || spans[i].enterTime! < periodEndTime)
      ) {
        if (spans[i].exitTime === null || spans[i].exitTime! > periodStartTime) {
          activeSpans.push(spans[i]);
        }
        i += 1;
      }

      interface WritableRecord extends Writable<SpaceMemberCountRecord> {
        readonly enterCounts: Writable<SpaceMemberCountRecordValues>;
        readonly uniqueEnterCounts: Writable<SpaceMemberCountRecordValues>;
        readonly exitCounts: Writable<SpaceMemberCountRecordValues>;
        readonly uniqueExitCounts: Writable<SpaceMemberCountRecordValues>;
        readonly stayCounts: Writable<SpaceMemberCountRecordValues>;
        readonly uniqueStayCounts: Writable<SpaceMemberCountRecordValues>;
      }
      const record: WritableRecord = {
        periodStartTime,
        periodEndTime,
        enterCounts: {},
        uniqueEnterCounts: {},
        exitCounts: {},
        uniqueExitCounts: {},
        stayCounts: {},
        uniqueStayCounts: {}
      };
      for (const group of groups) {
        const activeGroupSpans = activeSpans.filter((s) => s.member[groupBy] === group);

        const enterSpans = activeGroupSpans
          .filter((s) => s.enterTime !== null && s.enterTime >= periodStartTime);
        record.enterCounts[group] = enterSpans.length;
        record.uniqueEnterCounts[group] = new Set(enterSpans.map((s) => s.member.memberId)).size;

        const exitSpans = activeGroupSpans
          .filter((s) => s.exitTime !== null && s.exitTime <= periodEndTime);
        record.exitCounts[group] = exitSpans.length;
        record.uniqueExitCounts[group] = new Set(exitSpans.map((s) => s.member.memberId)).size;

        record.stayCounts[group] = activeGroupSpans.length;
        record.uniqueStayCounts[group] =
          new Set(activeGroupSpans.map((s) => s.member.memberId)).size;
      }
      records.push(record);

      for (let j = activeSpans.length - 1; j >= 0; j -= 1) {
        if (activeSpans[j].exitTime !== null && activeSpans[j].exitTime! <= periodEndTime) {
          activeSpans.splice(j, 1);
        }
      }
    }

    return {
      groups,
      records
    };
  }
}
