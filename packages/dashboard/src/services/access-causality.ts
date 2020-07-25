import { injectableConstructor, singleton } from '@innolens/resolver/lib-web';

import { stringTag } from '../utils/class';
import { Debouncer } from '../utils/debouncer';
import { PromiseValue } from '../utils/promise';

import * as AccessCausalityGlue from './glues/access-causality';
import { OAuth2Service } from './oauth2';


export type AccessCausalityFeaturesHistory =
  PromiseValue<ReturnType<typeof AccessCausalityGlue.GetFeaturesHistory.handleResponse>>;


export type AccessCausalityInputFeaturesHistory =
  Parameters<typeof AccessCausalityGlue.GetFeaturesForecast.createRequest>[0]['body'];

export type AccessCausalityFeaturesForecast =
  PromiseValue<ReturnType<typeof AccessCausalityGlue.GetFeaturesForecast.handleResponse>>;


@injectableConstructor({
  oauth2Service: OAuth2Service
})
@singleton()
@stringTag()
export class AccessCausalityService {
  private readonly _oauth2Service: OAuth2Service;

  private readonly _debouncer = new Debouncer();


  public constructor(deps: { readonly oauth2Service: OAuth2Service }) {
    ({ oauth2Service: this._oauth2Service } = deps);
  }


  public async fetchFeaturesHistory(opts: {
    readonly fromTime?: Date;
    readonly toTime: Date;
    readonly timeStepMs?: number;
  }): Promise<AccessCausalityFeaturesHistory> {
    const {
      fromTime,
      toTime,
      timeStepMs
    } = opts;

    const key = JSON.stringify({
      fromTime,
      toTime,
      timeStepMs
    });

    return this._debouncer.debounce(`features-history:${key}`, async () => {
      const data = await this._oauth2Service
        .withAccessToken((token) => fetch(AccessCausalityGlue.GetFeaturesHistory.createRequest({
          authentication: { token },
          body: {
            fromTime,
            toTime,
            timeStepMs
          }
        })))
        .then(AccessCausalityGlue.GetFeaturesHistory.handleResponse);
      return data;
    });
  }

  public async fetchFeaturesForecast(
    inputHistory: AccessCausalityInputFeaturesHistory
  ): Promise<AccessCausalityFeaturesForecast> {
    const data = await this._oauth2Service
      .withAccessToken((token) => fetch(AccessCausalityGlue.GetFeaturesForecast.createRequest({
        authentication: { token },
        body: {
          startTimes: inputHistory.startTimes,
          endTimes: inputHistory.endTimes,
          features: inputHistory.features,
          values: inputHistory.values
        }
      })))
      .then(AccessCausalityGlue.GetFeaturesForecast.handleResponse);
    return data;
  }
}
