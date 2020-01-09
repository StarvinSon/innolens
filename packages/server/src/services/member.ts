import { ObjectId } from 'mongodb';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';
import { Member, MemberCollection } from '../db/member';
import { SomePartial } from '../utils/object';


export { Member };

export interface MemberService {
  findAll(): AsyncIterable<Member>;
  findOneById(id: ObjectId): Promise<Member | null>;
  insertOne(member: Member): Promise<void>;
  insertMany(members: ReadonlyArray<SomePartial<Member, '_id'>>): Promise<void>
}


export class MemberServiceImpl implements MemberService {
  private readonly _memberCollection: MemberCollection;

  public constructor(options: {
    memberCollection: MemberCollection;
  }) {
    ({
      memberCollection: this._memberCollection
    } = options);
  }

  public async *findAll(): AsyncIterable<Member> {
    yield* this._memberCollection.find({}, { limit: 10 });
  }

  public async findOneById(id: ObjectId): Promise<Member | null> {
    return this._memberCollection.findOne({ _id: id });
  }

  public async insertOne(member: Member): Promise<void> {
    await this._memberCollection.insertOne(member);
  }

  public async insertMany(members: ReadonlyArray<SomePartial<Member, '_id'>>): Promise<void> {
    if (members.length === 0) {
      return;
    }
    await this._memberCollection.insertMany(members.map<Member>((member) =>
      member._id === undefined
        ? {
          ...member,
          _id: new ObjectId()
        }
        : member as Member));
  }
}


export const MemberService = createToken<Promise<MemberService>>(__filename, 'MemberService');

export const registerMemberService = createAsyncSingletonRegistrant(
  MemberService,
  { memberCollection: MemberCollection },
  (opts) => new MemberServiceImpl(opts)
);
