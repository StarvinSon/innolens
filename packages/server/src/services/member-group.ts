import { createToken, createAsyncSingletonRegistrant } from '../resolver';
import { MemberGroup, MemberGroupCollection } from '../db/member-group';

export { MemberGroup };


export interface MemberGroupService {
  findLatestBatch(): Promise<Array<MemberGroup>>;
}


export class MemberGroupServiceImpl implements MemberGroupService {
  private readonly _memberGroupCollection: MemberGroupCollection;

  public constructor(options: {
    memberGroupCollection: MemberGroupCollection;
  }) {
    ({
      memberGroupCollection: this._memberGroupCollection
    } = options);
  }

  public async findLatestBatch(): Promise<Array<MemberGroup>> {
    const latestRecord = await this._memberGroupCollection
      /* eslint-disable @typescript-eslint/indent */
      .findOne<Pick<MemberGroup, 'batchId'>>({}, {
        sort: { _id: -1 },
        projection: {
          batchId: true
        }
      });
      /* eslint-enable @typescript-eslint/indent */
    if (latestRecord === null) {
      return [];
    }

    return this._memberGroupCollection
      .find({
        batchId: latestRecord.batchId
      })
      .toArray();
  }
}


export const MemberGroupService =
  createToken<Promise<MemberGroupService>>(__filename, 'MemberGroupService');

export const registerMemberGroupService = createAsyncSingletonRegistrant(
  MemberGroupService,
  { memberGroupCollection: MemberGroupCollection },
  (opts) => new MemberGroupServiceImpl(opts)
);
