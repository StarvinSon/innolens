import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { subDays, subHours, addHours } from 'date-fns';
import { FilterQuery, QuerySelector } from 'mongodb';

import { TypedAggregationCursor } from '../db/cursor';
import { MachineAccessRecord, MachineAccessRecordCollection } from '../db/machine-access-record';
import { MachineInstanceCollection, MachineInstance } from '../db/machine-instance';
import { MachineType, MachineTypeCollection } from '../db/machine-type';
import { MemberCollection } from '../db/member';
import { Writable } from '../utils/object';

import { Member } from './member';


type PromiseRaceSettleResult<T> = {
  status: 'filfilled';
  value: T;
  promise: Promise<T>;
} | {
  status: 'rejected';
  reason: any;
  promise: Promise<T>;
};

const raceSettled =
  async <T>(promises: Iterable<Promise<T>>): Promise<PromiseRaceSettleResult<T>> =>
    new Promise<PromiseRaceSettleResult<T>>((resolve) => {
      for (const promise of promises) {
        promise
          .then((value) => resolve({
            status: 'filfilled',
            value,
            promise
          }))
          .catch((reason) => resolve({
            status: 'rejected',
            reason,
            promise
          }));
      }
    });

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


export { MachineType, MachineInstance, MachineAccessRecord };

export const machineMemberCountHistoryGroupBys = [
  'all',
  'department',
  'typeOfStudy',
  'studyProgramme',
  'yearOfStudy',
  'affiliatedStudentInterestGroup'
] as const;

export type MachineMemberCountHistoryGroupBy = (typeof machineMemberCountHistoryGroupBys)[number];

export interface MachineMemberCountHistory {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<MachineMemberCountRecord>;
}

export interface MachineMemberCountRecord {
  readonly periodStartTime: Date;
  readonly periodEndTime: Date;
  readonly acquireCounts: MachineMemberCountRecordValues;
  readonly uniqueAcquireCounts: MachineMemberCountRecordValues;
  readonly releaseCounts: MachineMemberCountRecordValues;
  readonly uniqueReleaseCounts: MachineMemberCountRecordValues;
  readonly useCounts: MachineMemberCountRecordValues;
  readonly uniqueUseCounts: MachineMemberCountRecordValues;
}

export interface MachineMemberCountRecordValues {
  readonly [group: string]: number;
}

@injectableConstructor({
  machineTypeCollection: MachineTypeCollection,
  machineInstanceCollection: MachineInstanceCollection,
  machineAccessRecordCollection: MachineAccessRecordCollection,
  memberCollection: MemberCollection
})
@singleton()
export class MachineService {
  private readonly _machineTypeCollection: MachineTypeCollection;
  private readonly _machineInstanceCollection: MachineInstanceCollection;
  private readonly _machineAccessRecordCollection: MachineAccessRecordCollection;
  private readonly _memberCollection: MemberCollection;

  public constructor(deps: {
    machineTypeCollection: MachineTypeCollection;
    machineInstanceCollection: MachineInstanceCollection;
    machineAccessRecordCollection: MachineAccessRecordCollection;
    memberCollection: MemberCollection;
  }) {
    ({
      machineTypeCollection: this._machineTypeCollection,
      machineInstanceCollection: this._machineInstanceCollection,
      machineAccessRecordCollection: this._machineAccessRecordCollection,
      memberCollection: this._memberCollection
    } = deps);
  }


  public async importTypes(types: ReadonlyArray<Omit<MachineType, '_id'>>): Promise<void> {
    if (types.length === 0) return;
    await this._machineTypeCollection
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

  public async getTypes(): Promise<Array<MachineType>> {
    return this._machineTypeCollection.find({}).toArray();
  }

  private async _hasType(typeId: string): Promise<boolean> {
    const count = await this._machineTypeCollection.countDocuments({ typeId }, { limit: 1 });
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
    instances: ReadonlyArray<Omit<MachineInstance, '_id' | 'typeId'>>
  ): Promise<void> {
    if (!await this._hasType(typeId)) {
      throw new MachineTypeNotFoundError([typeId]);
    }

    if (instances.length === 0) return;
    await this._machineInstanceCollection
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

  public async getInstances(typeId: string): Promise<Array<MachineInstance>> {
    return this._machineInstanceCollection.find({ typeId }).toArray();
  }

  private async _hasInstance(typeId: string, instanceId: string): Promise<boolean> {
    const count = await this._machineInstanceCollection
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
    records: ReadonlyArray<Omit<MachineAccessRecord, '_id' | 'typeId' | 'instanceId'>>
  ): Promise<void> {
    if (!await this._hasInstance(typeId, instanceId)) {
      throw new MachineTypeNotFoundError([typeId]);
    }

    const deleteFilterQuery: FilterQuery<Writable<MachineAccessRecord>> = {
      typeId,
      instanceId
    };
    if (deleteFromTime !== null || deleteToTime !== null) {
      const timeQuerySelector: QuerySelector<Date> = {};
      if (deleteFromTime !== null) timeQuerySelector.$gte = deleteFromTime;
      if (deleteToTime !== null) timeQuerySelector.$lt = deleteToTime;
      deleteFilterQuery.time = timeQuerySelector;
    }
    await this._machineAccessRecordCollection.deleteMany(deleteFilterQuery);

    await this._machineAccessRecordCollection.insertMany(records.map((record) => ({
      ...record,
      typeId,
      instanceId
    })));
  }


  public async getMemberCountHistory(
    typeIds: ReadonlyArray<string> | null,
    instanceIds: ReadonlyArray<string> | null,
    groupBy: MachineMemberCountHistoryGroupBy,
    pastHours: number
  ): Promise<MachineMemberCountHistory> {
    if (
      (typeIds === null || typeIds.length > 1)
      && instanceIds !== null
    ) {
      throw new TypeError('Invalid combination of arguments');
    }

    const endTime = new Date();
    const startTime = subHours(endTime, pastHours);

    if (typeIds !== null && !await this._hasAllTypes(typeIds)) {
      throw new MachineTypeNotFoundError(typeIds);
    }
    if (
      typeIds !== null && instanceIds !== null
      && !await this._hasAllInstances(typeIds[0], instanceIds)
    ) {
      throw new MachineInstanceNotFoundError(typeIds[0], instanceIds);
    }

    type Record = MachineAccessRecord & { readonly member?: Member };
    type RecordCursor = TypedAggregationCursor<Record>;
    const cursor: RecordCursor = this._machineAccessRecordCollection.aggregate([
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
    if (groupBy === 'all') {
      groupSet.add('all');
    } else {
      for (const span of spans) {
        groupSet.add(span.member[groupBy]);
      }
    }
    const groups: ReadonlyArray<string> = Array.from(groupSet);

    // Get history
    let i = 0;
    const activeSpans: Array<Span> = [];
    const records: Array<MachineMemberCountRecord> = [];
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

      interface WritableRecord extends Writable<MachineMemberCountRecord> {
        readonly acquireCounts: Writable<MachineMemberCountRecordValues>;
        readonly uniqueAcquireCounts: Writable<MachineMemberCountRecordValues>;
        readonly releaseCounts: Writable<MachineMemberCountRecordValues>;
        readonly uniqueReleaseCounts: Writable<MachineMemberCountRecordValues>;
        readonly useCounts: Writable<MachineMemberCountRecordValues>;
        readonly uniqueUseCounts: Writable<MachineMemberCountRecordValues>;
      }
      const record: WritableRecord = {
        periodStartTime,
        periodEndTime,
        acquireCounts: {},
        uniqueAcquireCounts: {},
        releaseCounts: {},
        uniqueReleaseCounts: {},
        useCounts: {},
        uniqueUseCounts: {}
      };
      for (const group of groups) {
        const activeGroupSpans = groupBy === 'all'
          ? activeSpans
          : activeSpans.filter((s) => s.member[groupBy] === group);

        const enterSpans = activeGroupSpans
          .filter((s) => s.acquireTime !== null && s.acquireTime >= periodStartTime);
        record.acquireCounts[group] = enterSpans.length;
        record.uniqueAcquireCounts[group] = new Set(enterSpans.map((s) => s.member.memberId)).size;

        const exitSpans = activeGroupSpans
          .filter((s) => s.releaseTime !== null && s.releaseTime <= periodEndTime);
        record.releaseCounts[group] = exitSpans.length;
        record.uniqueReleaseCounts[group] = new Set(exitSpans.map((s) => s.member.memberId)).size;

        record.useCounts[group] = activeGroupSpans.length;
        record.uniqueUseCounts[group] =
          new Set(activeGroupSpans.map((s) => s.member.memberId)).size;
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
