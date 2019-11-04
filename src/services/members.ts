import { ObjectId } from 'mongodb';

import { Member } from '../db';

import { CommonServiceOptions } from './common';


export { Member };


export type MembersServiceCollectionMap = {
  members: Member;
}

export interface MembersService {
  findAll(): AsyncIterable<Member>;
  findOne(id: ObjectId): Promise<Member | null>;
  insertOne(member: Member): Promise<void>;
}

export const createMembersService = (
  options: CommonServiceOptions<MembersServiceCollectionMap>
): MembersService => {
  const { appDbClient } = options;

  return {

    async* findAll() {
      yield* appDbClient.db.members.find({}, { limit: 10 });
    },

    async findOne(id) {
      return appDbClient.db.members.findOne({ id });
    },

    async insertOne(member) {
      await appDbClient.db.members.insertOne(member);
    }

  };
};
