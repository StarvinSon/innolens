import { injectableConstructor } from '@innolens/resolver/node';

import { AccessCausalityService } from '../services/access-causality';
import { OAuth2Service } from '../services/oauth2';

import { AccessCausalityControllerGlue } from './glues/access-causality';


@injectableConstructor({
  oauth2Service: OAuth2Service,
  accessCausalityService: AccessCausalityService
})
export class AccessCausalityController extends AccessCausalityControllerGlue {
  private readonly _oauth2Service: OAuth2Service;
  private readonly _accessCausalityService: AccessCausalityService;

  public constructor(deps: {
    oauth2Service: OAuth2Service;
    accessCausalityService: AccessCausalityService;
  }) {
    super();
    ({
      oauth2Service: this._oauth2Service,
      accessCausalityService: this._accessCausalityService
    } = deps);
  }

  protected checkBearerToken(token: string): Promise<boolean> {
    return this._oauth2Service.checkAccessToken(token);
  }


  protected async handleGetFeatureHistory(
    ctx: AccessCausalityControllerGlue.GetFeatureHistoryContext
  ): Promise<void> {
    ctx.responseBodyData = await this._accessCausalityService.getFeatureHistory({
      fromTime: ctx.requestBody.fromTime,
      toTime: ctx.requestBody.toTime,
      timeStepMs: ctx.requestBody.timeStepMs ?? (30 * 60 * 1000)
    });
  }
}
