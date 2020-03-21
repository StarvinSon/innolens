import { createReadStream } from 'fs';

import { singleton, injectableConstructor } from '@innolens/resolver';
import parseCsv from 'csv-parse';
import { ObjectId } from 'mongodb';

import { Member, MemberCollection } from '../db/member';


export { Member };


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
        registrationTime: new Date(record.registration_time)
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
