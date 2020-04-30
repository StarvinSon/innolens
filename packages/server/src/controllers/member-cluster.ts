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


  protected async handleGetMemberFeaturesHistory(
    ctx: MemberClusterControllerGlue.GetMemberFeaturesHistoryContext
  ): Promise<void> {
    ctx.responseBodyData = await this._memberClusterService.getMemberFeaturesHistory({
      fromTime: ctx.requestBody.fromTime,
      toTime: ctx.requestBody.toTime,
      timeStepMs: ctx.requestBody.timeStepMs ?? (30 * 60 * 1000),
      filterMemberIds: ctx.requestBody.filterMemberIds ?? null,
      filterSpaceIds: ctx.requestBody.filterSpaceIds ?? null
    });
  }

  protected async handleGetMemberClusters(
    ctx: MemberClusterControllerGlue.GetMemberClustersContext
  ): Promise<void> {
    ctx.responseBodyData = await this._memberClusterService.getClusters({
      fromTime: ctx.requestBody.fromTime,
      toTime: ctx.requestBody.toTime,
      timeStepMs: ctx.requestBody.timeStepMs ?? (30 * 60 * 1000),
      filterMemberIds: ctx.requestBody.filterMemberIds ?? null,
      filterSpaceIds: ctx.requestBody.filterSpaceIds ?? null
    });
  }
}
