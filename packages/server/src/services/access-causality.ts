import { singleton, injectableConstructor } from '@innolens/resolver/node';

import { MemberService } from './member';
import { SpaceService } from './space';


export interface FeatureHistory {
  readonly timeSpans: ReadonlyArray<readonly [Date, Date]>;
  readonly features: ReadonlyArray<string>;
  readonly values: ReadonlyArray<ReadonlyArray<number>>;
}


@injectableConstructor({
  memberService: MemberService,
  spaceService: SpaceService
})
@singleton()
export class AccessCausalityService {
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


  public async getFeatureHistory(opts: {
    readonly fromTime: Date;
    readonly toTime: Date;
    readonly timeStepMs: number;
  }): Promise<FeatureHistory> {
    const {
      fromTime,
      toTime,
      timeStepMs
    } = opts;

    const spaceMemberHistory = await this._spaceService.getMemberCountHistory2({
      fromTime,
      toTime,
      timeStepMs,
      filterSpaceIds: null,
      filterMemberIds: null,
      countType: 'stay',
      groupBy: 'space'
    });

    const { timeSpans, values } = spaceMemberHistory;
    const features = spaceMemberHistory.groups;

    return {
      timeSpans,
      features,
      values
    };
  }
}
