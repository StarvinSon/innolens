import { ObjectId } from 'mongodb';

import { createToken, createSingletonDependencyRegistrant, DependencyCreator } from '../app-context';
import { Member, MemberCollection } from '../db/member';


export { Member };

export interface MemberService {
  find(): AsyncIterable<Member>;
  findById(id: ObjectId): Promise<Member | null>;
  insert(member: Member): Promise<void>;
}

export const MemberService = createToken<Promise<MemberService>>(module, 'MemberService');

export const createMemberService: DependencyCreator<Promise<MemberService>> = async (appCtx) => {
  const memberCollection = await appCtx.resolve(MemberCollection);

  const find: MemberService['find'] = async function* () {
    yield* memberCollection.find({}, { limit: 10 });
  };

  const findById: MemberService['findById'] = async (id) =>
    memberCollection.findOne({ _id: id });

  const insert: MemberService['insert'] = async (member) => {
    await memberCollection.insertOne(member);
  };

  return {
    find,
    findById,
    insert
  };
};

// eslint-disable-next-line max-len
export const registerMemberService = createSingletonDependencyRegistrant(MemberService, createMemberService);
