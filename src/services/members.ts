import { ObjectId } from 'mongodb';

import { Member, MembersCollection } from '../db/members';
import { createToken, createSingletonDependencyRegistrant, DependencyCreator } from '../app-context';


export { Member };

export interface MembersService {
  find(): AsyncIterable<Member>;
  findById(id: ObjectId): Promise<Member | null>;
  insert(member: Member): Promise<void>;
}

export const MembersService = createToken<Promise<MembersService>>(module, 'MembersService');

export const createMembersService: DependencyCreator<Promise<MembersService>> = async (appCtx) => {
  const membersCollection = await appCtx.resolve(MembersCollection);

  const find: MembersService['find'] = async function* () {
    yield* membersCollection.find({}, { limit: 10 });
  };

  const findById: MembersService['findById'] = async (id) =>
    membersCollection.findOne({ _id: id });

  const insert: MembersService['insert'] = async (member) => {
    await membersCollection.insertOne(member);
  };

  return {
    find,
    findById,
    insert
  };
};

// eslint-disable-next-line max-len
export const registerMembersService = createSingletonDependencyRegistrant(MembersService, createMembersService);
