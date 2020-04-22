import { URL } from 'url';

import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { addMilliseconds } from 'date-fns';
import fetch from 'node-fetch';

import { MemberService } from './member';
import { SpaceService, SpaceMemberHistory } from './space';


export interface MemberActivityHistory {
  readonly memberIds: ReadonlyArray<string>;
  readonly features: ReadonlyArray<string>;
  readonly timeSpans: ReadonlyArray<readonly [Date, Date]>;
  readonly values: {
    readonly [memberId: string]: {
      readonly [feature: string]: ReadonlyArray<number>;
    };
  };
}


export interface MemberClusterResult extends MemberActivityHistory {
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


  public async getMemberActivityHistory(opts: {
    readonly fromTime: Date;
    readonly toTime: Date;
    readonly timeStepMs: number;
    readonly filter?: {
      readonly memberIds?: ReadonlyArray<string> | null;
    };
  }): Promise<MemberActivityHistory> {
    const {
      fromTime,
      toTime,
      timeStepMs
    } = opts;

    let memberIds: ReadonlyArray<string>;
    if (
      opts.filter !== undefined && opts.filter.memberIds !== undefined
      && opts.filter.memberIds !== null
    ) {
      memberIds = opts.filter.memberIds;
    } else {
      memberIds = (await this._memberService.getMembers()).map((m) => m.memberId);
    }

    const spaceIds = (await this._spaceService.getSpaces()).map((space) => space.spaceId);
    // eslint-disable-next-line max-len
    const spaceMemberHistorys = new Map(await Promise.all(spaceIds.map(async (spaceId): Promise<[string, SpaceMemberHistory]> => {
      const memberHistory = await this._spaceService.getMemberHistory({
        fromTime,
        toTime,
        timeStepMs,
        filter: {
          spaceIds: [spaceId],
          memberIds
        },
        countType: 'uniqueStay'
      });
      return [spaceId, memberHistory];
    })));

    const timeSpans: Array<MemberActivityHistory['timeSpans'][number]> = [];
    const values =
      Object.fromEntries(memberIds.map((memberId): [string, Record<string, Array<number>>] => [
        memberId,
        Object.fromEntries(spaceIds.map((spaceId): [string, Array<number>] => [
          spaceId,
          []
        ]))
      ]));

    for (
      // eslint-disable-next-line max-len
      let periodStartTime = fromTime, periodEndTime = addMilliseconds(periodStartTime, timeStepMs), i = 0;
      periodStartTime < toTime;
      // eslint-disable-next-line max-len
      periodStartTime = periodEndTime, periodEndTime = addMilliseconds(periodEndTime, timeStepMs), i += 1
    ) {
      timeSpans.push([periodStartTime, periodEndTime]);
      for (const memberId of memberIds) {
        for (const spaceId of spaceIds) {
          const spaceMemberHistory = spaceMemberHistorys.get(spaceId)!;
          values[memberId][spaceId].push(
            spaceMemberHistory
              .records[i].groups[spaceMemberHistory.groups[0]].includes(memberId) ? 1 : 0
          );
        }
      }
    }

    return {
      memberIds,
      features: spaceIds,
      timeSpans,
      values
    };
  }

  public async getCluster(opts: {
    readonly fromTime: Date;
    readonly toTime: Date;
    readonly timeStepMs: number;
    readonly filter?: {
      readonly memberIds?: ReadonlyArray<string> | null;
    };
  }): Promise<MemberClusterResult> {
    const history = await this.getMemberActivityHistory({
      fromTime: opts.fromTime,
      toTime: opts.toTime,
      timeStepMs: opts.timeStepMs,
      filter: {
        memberIds: opts.filter?.memberIds
      }
    });

    const url = new URL('http://localhost:5000/cluster');
    // url.searchParams.set('ui', '');
    const res = await fetch(url.href, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        memberIds: history.memberIds,
        features: history.features,
        timeSpans: history.timeSpans,
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
