import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';
import { MemberGroup, MemberGroupCollection } from '../db/member-group';

export { MemberGroup };


export interface MemberGroupService {
  findLatestBatch(): Promise<Array<MemberGroup>>;
}

export const MemberGroupService = createToken<Promise<MemberGroupService>>(module, 'MemberGroupService');

// eslint-disable-next-line max-len
export const createMemberGroupService: DependencyCreator<Promise<MemberGroupService>> = async (appCtx) => {
  const memberGroupCollection = await appCtx.resolve(MemberGroupCollection);

  const findLatestBatch: MemberGroupService['findLatestBatch'] = async () => {
    const latestRecord = await memberGroupCollection.findOne<Pick<MemberGroup, 'batchId'>>({}, {
      sort: { _id: -1 },
      projection: {
        batchId: true
      }
    });
    if (latestRecord === null) {
      return [];
    }

    return memberGroupCollection.find({
      batchId: latestRecord.batchId
    }).toArray();
  };

  return {
    findLatestBatch
  };
};

// eslint-disable-next-line max-len
export const registerMemberGroupService = createSingletonDependencyRegistrant(MemberGroupService, createMemberGroupService);
