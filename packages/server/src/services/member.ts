import { ObjectId } from 'mongodb';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';
import { Member, MemberCollection } from '../db/member';


export { Member };

export interface MemberService {
  find(): AsyncIterable<Member>;
  findById(id: ObjectId): Promise<Member | null>;
  insert(member: Member): Promise<void>;
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

  public async *find(): AsyncIterable<Member> {
    yield* this._memberCollection.find({}, { limit: 10 });
  }

  public async findById(id: ObjectId): Promise<Member | null> {
    return this._memberCollection.findOne({ _id: id });
  }

  public async insert(member: Member): Promise<void> {
    await this._memberCollection.insertOne(member);
  }
}


export const MemberService = createToken<Promise<MemberService>>(__filename, 'MemberService');

export const registerMemberService = createAsyncSingletonRegistrant(
  MemberService,
  { memberCollection: MemberCollection },
  (opts) => new MemberServiceImpl(opts)
);
