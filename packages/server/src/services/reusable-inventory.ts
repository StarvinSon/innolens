import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { subDays, subHours, addHours } from 'date-fns';
import { FilterQuery, QuerySelector } from 'mongodb';

import { TypedAggregationCursor } from '../db/cursor';
import { MemberCollection } from '../db/member';
import { ReusableInventoryAccessRecord, ReusableInventoryAccessRecordCollection } from '../db/reusable-inventory-access-record';
import { ReusableInventoryInstanceCollection, ReusableInventoryInstance } from '../db/reusable-inventory-instance';
import { ReusableInventoryType, ReusableInventoryTypeCollection } from '../db/reusable-inventory-type';
import { Writable } from '../utils/object';
import { raceSettled } from '../utils/promise';

import { Member } from './member';


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


export { ReusableInventoryType, ReusableInventoryInstance, ReusableInventoryAccessRecord };

export const reusableInventoryMemberCountHistoryGroupBys = [
  'department',
  'typeOfStudy',
  'studyProgramme',
  'yearOfStudy',
  'affiliatedStudentInterestGroup'
] as const;

export type ReusableInventoryMemberCountHistoryGroupBy =
  (typeof reusableInventoryMemberCountHistoryGroupBys)[number];

export const reusableInventoryMemberCountHistoryCountTypes = [
  'acquireCounts',
  'uniqueAcquireCounts',
  'releaseCounts',
  'uniqueReleaseCounts',
  'useCounts',
  'uniqueUseCounts'
] as const;

export type ReusableInventoryMemberCountHistoryCountTypes =
  (typeof reusableInventoryMemberCountHistoryCountTypes)[number];

export interface ReusableInventoryMemberCountHistory {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<ReusableInventoryMemberCountRecord>;
}

export interface ReusableInventoryMemberCountRecord {
  readonly periodStartTime: Date;
  readonly periodEndTime: Date;
  readonly counts: {
    readonly [group: string]: number;
  };
}

@injectableConstructor({
  reusableInventoryTypeCollection: ReusableInventoryTypeCollection,
  reusableInventoryInstanceCollection: ReusableInventoryInstanceCollection,
  reusableInventoryAccessRecordCollection: ReusableInventoryAccessRecordCollection,
  memberCollection: MemberCollection
})
@singleton()
export class ReusableInventoryService {
  private readonly _reusableInventoryTypeCollection: ReusableInventoryTypeCollection;
  private readonly _reusableInventoryInstanceCollection: ReusableInventoryInstanceCollection;
  // eslint-disable-next-line max-len
  private readonly _reusableInventoryAccessRecordCollection: ReusableInventoryAccessRecordCollection;
  private readonly _memberCollection: MemberCollection;

  public constructor(deps: {
    reusableInventoryTypeCollection: ReusableInventoryTypeCollection;
    reusableInventoryInstanceCollection: ReusableInventoryInstanceCollection;
    reusableInventoryAccessRecordCollection: ReusableInventoryAccessRecordCollection;
    memberCollection: MemberCollection;
  }) {
    ({
      reusableInventoryTypeCollection: this._reusableInventoryTypeCollection,
      reusableInventoryInstanceCollection: this._reusableInventoryInstanceCollection,
      reusableInventoryAccessRecordCollection: this._reusableInventoryAccessRecordCollection,
      memberCollection: this._memberCollection
    } = deps);
  }


  public async importTypes(types: ReadonlyArray<Omit<ReusableInventoryType, '_id'>>): Promise<void> {
    if (types.length === 0) return;
    await this._reusableInventoryTypeCollection
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

  public async getTypes(): Promise<Array<ReusableInventoryType>> {
    return this._reusableInventoryTypeCollection.find({}).toArray();
  }

  private async _hasType(typeId: string): Promise<boolean> {
    const count = await this._reusableInventoryTypeCollection
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


  public async importInstances(
    typeId: string,
    instances: ReadonlyArray<Omit<ReusableInventoryInstance, '_id' | 'typeId'>>
  ): Promise<void> {
    if (!await this._hasType(typeId)) {
      throw new ReusableInventoryTypeNotFoundError([typeId]);
    }

    if (instances.length === 0) return;
    await this._reusableInventoryInstanceCollection
      .bulkWrite(
        instances.map((instance) => ({
          replaceOne: {
            filter: {
              typeId,
              instanceId: instance.instanceId
            },
            replacement: {
              ...instance,
              typeId
            },
            upsert: true
          }
        })),
        { ordered: false }
      );
  }

  public async getInstances(typeId: string): Promise<Array<ReusableInventoryInstance>> {
    return this._reusableInventoryInstanceCollection.find({ typeId }).toArray();
  }

  private async _hasInstance(typeId: string, instanceId: string): Promise<boolean> {
    const count = await this._reusableInventoryInstanceCollection
      .countDocuments({ typeId, instanceId }, { limit: 1 });
    return count >= 1;
  }

  private async _hasAllInstances(
    typeId: string,
    instanceIds: ReadonlyArray<string>
  ): Promise<boolean> {
    const promises = new Set(instanceIds
      .map(async (id) => this._hasInstance(typeId, id)));
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

  public async importAccessRecords(
    typeId: string,
    instanceId: string,
    deleteFromTime: Date | null,
    deleteToTime: Date | null,
    records: ReadonlyArray<Omit<ReusableInventoryAccessRecord, '_id' | 'typeId' | 'instanceId'>>
  ): Promise<void> {
    if (!await this._hasInstance(typeId, instanceId)) {
      throw new ReusableInventoryTypeNotFoundError([typeId]);
    }

    const deleteFilterQuery: FilterQuery<Writable<ReusableInventoryAccessRecord>> = {
      typeId,
      instanceId
    };
    if (deleteFromTime !== null || deleteToTime !== null) {
      const timeQuerySelector: QuerySelector<Date> = {};
      if (deleteFromTime !== null) timeQuerySelector.$gte = deleteFromTime;
      if (deleteToTime !== null) timeQuerySelector.$lt = deleteToTime;
      deleteFilterQuery.time = timeQuerySelector;
    }
    await this._reusableInventoryAccessRecordCollection.deleteMany(deleteFilterQuery);

    if (records.length > 0) {
      await this._reusableInventoryAccessRecordCollection.insertMany(records.map((record) => ({
        ...record,
        typeId,
        instanceId
      })));
    }
  }


  public async getMemberCountHistory(
    pastHours: number,
    typeIds: ReadonlyArray<string> | null,
    instanceIds: ReadonlyArray<string> | null,
    groupBy: ReusableInventoryMemberCountHistoryGroupBy | null,
    countTypes: ReusableInventoryMemberCountHistoryCountTypes
  ): Promise<ReusableInventoryMemberCountHistory> {
    if (
      (typeIds === null || typeIds.length > 1)
      && instanceIds !== null
    ) {
      throw new TypeError('Invalid combination of arguments');
    }

    const endTime = new Date();
    const startTime = subHours(endTime, pastHours);

    if (typeIds !== null && !await this._hasAllTypes(typeIds)) {
      throw new ReusableInventoryTypeNotFoundError(typeIds);
    }
    if (
      typeIds !== null && instanceIds !== null
      && !await this._hasAllInstances(typeIds[0], instanceIds)
    ) {
      throw new ReusableInventoryInstanceNotFoundError(typeIds[0], instanceIds);
    }

    type Record = ReusableInventoryAccessRecord & { readonly member?: Member };
    type RecordCursor = TypedAggregationCursor<Record>;
    const cursor: RecordCursor = this._reusableInventoryAccessRecordCollection.aggregate([
      {
        $match: {
          ...typeIds === null ? {} : {
            typeId: {
              $in: typeIds
            }
          },
          ...instanceIds === null ? {} : {
            instanceId: {
              $in: instanceIds
            }
          },
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
      readonly acquireTime: Date | null;
      readonly releaseTime: Date | null;
      readonly member: Member;
    }
    const acquiredMemberInfos = new Map<string, {
      readonly enterTime: Date;
      readonly member: Member | null;
    }>();
    const exitedMemberIds = new Set<string>();
    let spans: Array<Span> = [];
    for await (const record of cursor) {
      switch (record.action) {
        case 'acquire': {
          if (!acquiredMemberInfos.has(record.memberId)) {
            acquiredMemberInfos.set(record.memberId, {
              enterTime: record.time,
              member: record.member ?? null
            });
          }
          break;
        }
        case 'release': {
          const info = acquiredMemberInfos.get(record.memberId);
          if (info !== undefined) {
            acquiredMemberInfos.delete(record.memberId);
            exitedMemberIds.add(record.memberId);
            if (info.member !== null) {
              spans.push({
                acquireTime: info.enterTime,
                releaseTime: record.time,
                member: info.member
              });
            }
          } else if (!exitedMemberIds.has(record.memberId)) {
            exitedMemberIds.add(record.memberId);
            if (record.member !== undefined) {
              spans.push({
                acquireTime: null,
                releaseTime: record.time,
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
    for (const info of acquiredMemberInfos.values()) {
      if (info.member !== null) {
        spans.push({
          acquireTime: info.enterTime,
          releaseTime: null,
          member: info.member
        });
      }
    }
    acquiredMemberInfos.clear();

    // Filter spans
    spans = spans.filter((s) => (
      (s.acquireTime === null || s.acquireTime.getTime() < endTime.getTime())
      && (s.releaseTime === null || s.releaseTime.getTime() > startTime.getTime())
    ));

    // Sort spans
    spans.sort((a, b) => (
      a.acquireTime === null ? -1
        : b.acquireTime === null ? 1
          : a.acquireTime.getTime() - b.acquireTime.getTime()
    ));

    // Get groups
    const groupSet = new Set<string>();
    if (groupBy === null) {
      groupSet.add('total');
    } else {
      for (const span of spans) {
        groupSet.add(span.member[groupBy]);
      }
    }
    const groups: ReadonlyArray<string> = Array.from(groupSet);

    // Get history
    let i = 0;
    const activeSpans: Array<Span> = [];
    const records: Array<ReusableInventoryMemberCountRecord> = [];
    for (
      let periodStartTime = startTime;
      periodStartTime < endTime;
      periodStartTime = addHours(periodStartTime, 1)
    ) {
      const periodEndTime = addHours(periodStartTime, 1);

      while (
        i < spans.length
        && (spans[i].acquireTime === null || spans[i].acquireTime! < periodEndTime)
      ) {
        if (spans[i].releaseTime === null || spans[i].releaseTime! > periodStartTime) {
          activeSpans.push(spans[i]);
        }
        i += 1;
      }

      interface WritableRecord extends Writable<ReusableInventoryMemberCountRecord> {
        readonly counts: Writable<ReusableInventoryMemberCountRecord['counts']>;
      }
      const record: WritableRecord = {
        periodStartTime,
        periodEndTime,
        counts: {}
      };
      for (const group of groups) {
        const activeGroupSpans = groupBy === null
          ? activeSpans
          : activeSpans.filter((s) => s.member[groupBy] === group);

        switch (countTypes) {
          case 'acquireCounts':
          case 'uniqueAcquireCounts': {
            const enterSpans = activeGroupSpans
              .filter((s) => s.acquireTime !== null && s.acquireTime >= periodStartTime);
            if (countTypes === 'acquireCounts') {
              record.counts[group] = enterSpans.length;
            } else {
              record.counts[group] = new Set(enterSpans.map((s) => s.member.memberId)).size;
            }
            break;
          }
          case 'releaseCounts':
          case 'uniqueReleaseCounts': {
            const exitSpans = activeGroupSpans
              .filter((s) => s.releaseTime !== null && s.releaseTime <= periodEndTime);
            if (countTypes === 'releaseCounts') {
              record.counts[group] = exitSpans.length;
            } else {
              record.counts[group] = new Set(exitSpans.map((s) => s.member.memberId)).size;
            }
            break;
          }
          case 'useCounts': {
            record.counts[group] = activeGroupSpans.length;
            break;
          }
          case 'uniqueUseCounts': {
            record.counts[group] =
              new Set(activeGroupSpans.map((s) => s.member.memberId)).size;
            break;
          }
          default: {
            throw new Error(`Unsupported count type: ${countTypes}`);
          }
        }
      }
      records.push(record);

      for (let j = activeSpans.length - 1; j >= 0; j -= 1) {
        if (activeSpans[j].releaseTime !== null && activeSpans[j].releaseTime! <= periodEndTime) {
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
