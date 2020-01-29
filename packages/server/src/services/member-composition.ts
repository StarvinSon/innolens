import { ObjectId } from 'mongodb';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';
import {
  MemberComposition, MemberCompositionCollection, MemberCompositionPerspective,
  MemberCompositionGroup
} from '../db/member-composition';


export { MemberComposition, MemberCompositionPerspective, MemberCompositionGroup };


export interface MemberCompositionService {
  findLatest(): Promise<MemberComposition | null>;
  insertOne(memberComposition: Omit<MemberComposition, '_id'>): Promise<void>;
}


export class MemberCompopsitionServiceImpl implements MemberCompositionService {
  private readonly _memberCompositionCollection: MemberCompositionCollection;

  public constructor(options: {
    memberCompositionCollection: MemberCompositionCollection;
  }) {
    ({
      memberCompositionCollection: this._memberCompositionCollection
    } = options);
  }

  public async findLatest(): Promise<MemberComposition | null> {
    return this._memberCompositionCollection
      .findOne({}, {
        sort: { time: -1 }
      });
  }

  public async insertOne(memberComposition: Omit<MemberComposition, '_id'>): Promise<void> {
    const withId: MemberComposition = {
      ...memberComposition,
      _id: new ObjectId()
    };
    await this._memberCompositionCollection
      .insertOne(withId);
  }
}


export const MemberCompositionService =
  createToken<Promise<MemberCompositionService>>(__filename, 'MemberCompositionService');

export const registerMemberCompositionService = createAsyncSingletonRegistrant(
  MemberCompositionService,
  { memberCompositionCollection: MemberCompositionCollection },
  (opts) => new MemberCompopsitionServiceImpl(opts)
);
