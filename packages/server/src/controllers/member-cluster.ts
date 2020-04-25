import { injectableConstructor } from '@innolens/resolver/node';

import { MemberClusterService } from '../services/member-cluster';
import { OAuth2Service } from '../services/oauth2';

import { MemberClusterControllerGlue } from './glues/member-cluster';


@injectableConstructor({
  oauth2Service: OAuth2Service,
  memberClusterService: MemberClusterService
})
export class MemberClusterController extends MemberClusterControllerGlue {
  private readonly _oauth2Service: OAuth2Service;
  private readonly _memberClusterService: MemberClusterService;

  public constructor(deps: {
    oauth2Service: OAuth2Service;
    memberClusterService: MemberClusterService;
  }) {
    super();
    ({
      oauth2Service: this._oauth2Service,
      memberClusterService: this._memberClusterService
    } = deps);
  }

  protected checkBearerToken(token: string): Promise<boolean> {
    return this._oauth2Service.checkAccessToken(token);
  }


  protected async handleGetMemberActivityHistory(
    ctx: MemberClusterControllerGlue.GetMemberActivityHistoryContext
  ): Promise<void> {
    ctx.responseBodyData = await this._memberClusterService.getMemberActivityHistory({
      fromTime: ctx.query.fromTime,
      toTime: ctx.query.toTime,
      timeStepMs: ctx.query.timeStepMs ?? (30 * 60 * 1000),
      filterMemberIds: ctx.query.filterMemberIds ?? null
    });
  }

  protected async handleGetMemberCluster(
    ctx: MemberClusterControllerGlue.GetMemberClusterContext
  ): Promise<void> {
    ctx.responseBodyData = await this._memberClusterService.getCluster({
      fromTime: ctx.query.fromTime,
      toTime: ctx.query.toTime,
      timeStepMs: ctx.query.timeStepMs ?? (30 * 60 * 1000),
      filterMemberIds: ctx.query.filterMemberIds ?? null
    });
  }
}
