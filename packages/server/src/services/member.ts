import { singleton, injectableConstructor } from '@innolens/resolver/node';
import {
  startOfDay, subDays, subMonths,
  addDays
} from 'date-fns';
import { FilterQuery } from 'mongodb';

import { Member, MemberCollection } from '../db/member';
import { Writable } from '../utils/object';


export { Member };


export interface MemberCountHistory {
  readonly categories: ReadonlyArray<string>;
  readonly records: ReadonlyArray<MemberCountRecord>;
}

export interface MemberCountRecord {
  readonly time: Date;
  readonly counts: {
    readonly [category: string]: number;
  };
}


@injectableConstructor({
  memberCollection: MemberCollection
})
@singleton()
export class MemberService {
  private readonly _memberCollection: MemberCollection;

  public constructor(options: {
    memberCollection: MemberCollection;
  }) {
    ({
      memberCollection: this._memberCollection
    } = options);
  }

  public async getDepartments(): Promise<ReadonlyArray<string>> {
    return this._memberCollection.distinct('department');
  }

  public async getTypesOfStudy(): Promise<ReadonlyArray<string>> {
    return this._memberCollection.distinct('typeOfStudy');
  }

  public async getStudyProgrammes(): Promise<ReadonlyArray<string>> {
    return this._memberCollection.distinct('studyProgramme');
  }

  public async getYearsOfStudy(): Promise<ReadonlyArray<string>> {
    return this._memberCollection.distinct('yearOfStudy');
  }

  public async getAffiliatedStudentInterestGroups(): Promise<ReadonlyArray<string>> {
    return this._memberCollection.distinct('affiliatedStudentInterestGroup');
  }

  public async getCount(filter: {
    readonly department?: ReadonlyArray<string>;
    readonly typeOfStudy?: ReadonlyArray<string>;
    readonly yearOfStudy?: ReadonlyArray<string>;
    readonly studyProgramme?: ReadonlyArray<string>;
    readonly affiliatedStudentInterestGroup?: ReadonlyArray<string>;
  }): Promise<number> {
    const query: FilterQuery<Writable<Member>> = {};
    if (filter.department !== undefined) {
      query.department = { $in: filter.department.slice() };
    }
    if (filter.typeOfStudy !== undefined) {
      query.typeOfStudy = { $in: filter.typeOfStudy.slice() };
    }
    if (filter.studyProgramme !== undefined) {
      query.studyProgramme = { $in: filter.studyProgramme.slice() };
    }
    if (filter.yearOfStudy !== undefined) {
      query.yearOfStudy = { $in: filter.yearOfStudy.slice() };
    }
    if (filter.affiliatedStudentInterestGroup !== undefined) {
      query.affiliatedStudentInterestGroup = { $in: filter.affiliatedStudentInterestGroup.slice() };
    }
    return this._memberCollection.countDocuments(query);
  }

  public async getHistory(
    category: 'department' | 'typeOfStudy' | 'studyProgramme' | 'yearOfStudy' | 'affiliatedStudentInterestGroup',
    range: 'past7Days' | 'past30Days' | 'past6Months' | 'past12Months'
  ): Promise<MemberCountHistory> {
    const endTime = startOfDay(new Date());
    let startTime = endTime;
    switch (range) {
      case 'past7Days': startTime = subDays(startTime, 7); break;
      case 'past30Days': startTime = subMonths(startTime, 1); break;
      case 'past6Months': startTime = subMonths(startTime, 6); break;
      case 'past12Months': startTime = subMonths(startTime, 12); break;
      default: throw new Error(`Unknown timeRange: ${range}`);
    }

    const members = await this._memberCollection
      .find({
        membershipStartTime: {
          $lt: endTime
        },
        membershipEndTime: {
          $gt: startTime
        }
      })
      .sort({
        membershipStartTime: 1,
        membershipEndTime: 1
      })
      .toArray();

    const categories = Array.from(new Set(members.map((m) => m[category])));
    const records: Array<MemberCountRecord> = [];

    const activeMembers: Array<Member> = [];
    let i = 0;
    for (let time = startTime; time < endTime; time = addDays(time, 1)) {
      while (i < members.length && members[i].membershipStartTime < time) {
        activeMembers.push(members[i]);
        i += 1;
      }
      for (let j = activeMembers.length - 1; j >= 0; j -= 1) {
        if (activeMembers[j].membershipEndTime < time) {
          activeMembers.splice(j, 1);
        }
      }

      const counts = Object.fromEntries(categories.map((c): [string, number] => [c, 0]));
      for (const activeMember of activeMembers) {
        counts[activeMember[category]] += 1;
      }
      records.push({
        time,
        counts
      });
    }

    return {
      categories,
      records
    };
  }

  public async import(members: ReadonlyArray<Omit<Member, '_id'>>): Promise<void> {
    await this._memberCollection
      .bulkWrite(
        members.map((member) => ({
          replaceOne: {
            filter: { memberId: member.memberId },
            replacement: member,
            upsert: true
          }
        })),
        { ordered: false }
      );
  }
}
