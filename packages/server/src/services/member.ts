import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import { ObjectId } from 'mongodb';

import { Member, MemberCollection } from '../db/member';


export { Member };

export interface MemberService {
  findAll(): AsyncIterable<Member>;
  findOneById(id: ObjectId): Promise<Member | null>;
  insertOne(member: Member): Promise<void>;
  insertMany(members: ReadonlyArray<Omit<Member, '_id'>>): Promise<void>
}

export const MemberService = createToken<MemberService>('MemberService');


@injectableConstructor({
  memberCollection: MemberCollection
})
@singleton()
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
}
