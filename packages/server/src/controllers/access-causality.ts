import { injectableConstructor } from '@innolens/resolver/lib-node';
import createHttpError from 'http-errors';
import { BAD_REQUEST } from 'http-status-codes';

import {
  AccessCausalityService, InvalidAccessCausalityInputFeaturesHistory,
  AccessCausalityFeatureForecast
} from '../services/access-causality';
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


  protected async handleGetFeaturesHistory(
    ctx: AccessCausalityControllerGlue.GetFeaturesHistoryContext
  ): Promise<void> {
    ctx.responseBodyData = await this._accessCausalityService.getFeaturesHistory({
      fromTime: ctx.requestBody.fromTime,
      toTime: ctx.requestBody.toTime,
      timeStepMs: ctx.requestBody.timeStepMs ?? (30 * 60 * 1000)
    });
  }

  protected async handleGetFeaturesForecast(
    ctx: AccessCausalityControllerGlue.GetFeaturesForecastContext
  ): Promise<void> {
    const inputHistory = ctx.requestBody;
    let forecast: AccessCausalityFeatureForecast;
    try {
      forecast = await this._accessCausalityService.getFeaturesForecast(inputHistory);
    } catch (err) {
      if (err instanceof InvalidAccessCausalityInputFeaturesHistory) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }
    ctx.responseBodyData = forecast;
  }
}
