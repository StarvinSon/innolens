import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';
import { MemberGroup, MemberGroupsCollection } from '../db/member-groups';

export { MemberGroup };


export interface MemberGroupsService {
  findLatestBatch(): Promise<Array<MemberGroup>>;
}

export const MemberGroupsService = createToken<Promise<MemberGroupsService>>(module, 'MemberGroupsService');

// eslint-disable-next-line max-len
export const createMemberGroupsService: DependencyCreator<Promise<MemberGroupsService>> = async (appCtx) => {
  const memberGroupsCollection = await appCtx.resolve(MemberGroupsCollection);

  const findLatestBatch: MemberGroupsService['findLatestBatch'] = async () => {
    const latestRecord = await memberGroupsCollection.findOne<Pick<MemberGroup, 'batchId'>>({}, {
      sort: { _id: -1 },
      projection: {
        batchId: true
      }
    });
    if (latestRecord === null) {
      return [];
    }

    return memberGroupsCollection.find({
      batchId: latestRecord.batchId
    }).toArray();
  };

  return {
    findLatestBatch
  };
};

// eslint-disable-next-line max-len
export const registerMemberGroupsService = createSingletonDependencyRegistrant(MemberGroupsService, createMemberGroupsService);
