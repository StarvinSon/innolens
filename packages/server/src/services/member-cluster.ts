import { URL } from 'url';

import { singleton, injectableConstructor } from '@innolens/resolver/node';
import fetch from 'node-fetch';

import { MemberService } from './member';
import { SpaceService } from './space';
import { timeSpanRange } from './time';


export interface MemberHistoryFeatures {
  readonly timeSpans: ReadonlyArray<readonly [Date, Date]>;
  readonly memberIds: ReadonlyArray<string>;
  readonly features: ReadonlyArray<string>;
  readonly values: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>;
}


export interface MemberClusterResult extends MemberHistoryFeatures {
  readonly clusters: ReadonlyArray<{
    readonly clusterId: number;
    readonly memberId: string | null;
    readonly childClusterIds: ReadonlyArray<number>;
    readonly distance: number;
    readonly size: number;
  }>;
}


@injectableConstructor({
  memberService: MemberService,
  spaceService: SpaceService
})
@singleton()
export class MemberClusterService {
  private readonly _memberService: MemberService;
  private readonly _spaceService: SpaceService;

  public constructor(deps: {
    readonly memberService: MemberService,
    readonly spaceService: SpaceService
  }) {
    ({
      memberService: this._memberService,
      spaceService: this._spaceService
    } = deps);
  }


  public async getMemberHistoryFeatures(opts: {
    readonly fromTime: Date;
    readonly toTime: Date;
    readonly timeStepMs: number;
    readonly filterMemberIds: ReadonlyArray<string> | null;
    readonly filterSpaceIds: ReadonlyArray<string> | null;
  }): Promise<MemberHistoryFeatures> {
    const {
      fromTime,
      toTime,
      timeStepMs,
      filterMemberIds,
      filterSpaceIds
    } = opts;

    let memberIds: ReadonlyArray<string>;
    if (filterMemberIds !== undefined && filterMemberIds !== null) {
      memberIds = filterMemberIds;
    } else {
      memberIds = (await this._memberService.getMembers()).map((m) => m.memberId);
    }

    let spaceIds: ReadonlyArray<string>;
    if (filterSpaceIds !== undefined && filterSpaceIds !== null) {
      spaceIds = filterSpaceIds;
    } else {
      spaceIds = (await this._spaceService.getSpaces()).map((space) => space.spaceId);
    }

    const spaceMemberHistories = new Map(await Promise.all(
      spaceIds.map(async (spaceId) => {
        const history = await this._spaceService.getMemberCountHistory({
          fromTime,
          toTime,
          timeStepMs,
          filterSpaceIds: [spaceId],
          groupBy: 'member',
          countType: 'uniqueStay'
        });
        return [spaceId, history] as const;
      })
    ));

    const timeSpans = timeSpanRange(fromTime, toTime, timeStepMs);
    const features = spaceIds; // concat other features...
    const values = memberIds.map((memberId) => [
      ...spaceIds.map((spaceId) => {
        const history = spaceMemberHistories.get(spaceId)!;
        const historyMemberIdx = history.groups.indexOf(memberId);
        return historyMemberIdx < 0
          ? timeSpans.map(() => 0)
          : history.values[historyMemberIdx];
      })
      // other features...
    ]);

    return {
      timeSpans,
      memberIds,
      features,
      values
    };
  }

  public async getClusters(opts: {
    readonly fromTime: Date;
    readonly toTime: Date;
    readonly timeStepMs: number;
    readonly filterMemberIds: ReadonlyArray<string> | null;
    readonly filterSpaceIds: ReadonlyArray<string> | null;
  }): Promise<MemberClusterResult> {
    const {
      fromTime,
      toTime,
      timeStepMs,
      filterMemberIds,
      filterSpaceIds
    } = opts;

    const history = await this.getMemberHistoryFeatures({
      fromTime,
      toTime,
      timeStepMs,
      filterMemberIds,
      filterSpaceIds
    });

    const url = new URL('http://localhost:5000/cluster-members');
    const res = await fetch(url.href, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timeSpans: history.timeSpans,
        memberIds: history.memberIds,
        features: history.features,
        values: history.values
      })
    });
    if (!res.ok) {
      throw new Error('cluster server responds not ok');
    }
    const resData = (await res.json()).data;

    return {
      ...history,
      clusters: resData
    };
  }
}
