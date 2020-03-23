import { createReadStream } from 'fs';

import { singleton, injectableConstructor } from '@innolens/resolver';
import parseCsv from 'csv-parse';
import {
  startOfDay, subDays, subMonths,
  addDays
} from 'date-fns';
import { ObjectId } from 'mongodb';

import { Member, MemberCollection } from '../db/member';


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

  public async *findAll(): AsyncIterable<Member> {
    yield* this._memberCollection.find({});
  }

  public async findOneById(id: ObjectId): Promise<Member | null> {
    return this._memberCollection.findOne({ _id: id });
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

  public async insertOne(member: Member): Promise<void> {
    await this._memberCollection.insertOne(member);
  }

  public async insertMany(members: ReadonlyArray<Omit<Member, '_id'>>): Promise<void> {
    if (members.length === 0) {
      return;
    }
    await this._memberCollection.insertMany(members.map<Member>((member) => ({
      ...member,
      _id: new ObjectId()
    })));
  }

  public async importFromFile(path: string): Promise<void> {
    const stream = createReadStream(path)
      .pipe(parseCsv({
        columns: true
      }));

    const importedMembers: Array<Omit<Member, '_id'>> = [];
    for await (const record of stream) {
      importedMembers.push({
        memberId: record.member_id,
        name: record.name,
        department: record.department,
        typeOfStudy: record.type_of_study,
        studyProgramme: record.study_programme,
        yearOfStudy: record.year_of_study,
        affiliatedStudentInterestGroup: record.affiliated_student_interest_group,
        membershipStartTime: new Date(record.membership_start_time),
        membershipEndTime: new Date(record.membership_end_time)
      });
    }

    await this._memberCollection
      .bulkWrite(
        importedMembers.map((member) => ({
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
