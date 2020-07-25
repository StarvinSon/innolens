import { injectableConstructor, singleton } from '@innolens/resolver/lib-web';

import { stringTag } from '../utils/class';
import { Debouncer } from '../utils/debouncer';
import { PromiseValue } from '../utils/promise';

import * as MemberClusterGlue from './glues/member-cluster';
import { OAuth2Service } from './oauth2';


export type MemberClustersResult =
  PromiseValue<ReturnType<typeof MemberClusterGlue.GetMemberClusters.handleResponse>>;


@injectableConstructor({
  oauth2Service: OAuth2Service
})
@singleton()
@stringTag()
export class MemberClusterService {
  private readonly _oauth2Service: OAuth2Service;

  private readonly _debouncer = new Debouncer();


  public constructor(deps: { readonly oauth2Service: OAuth2Service }) {
    ({ oauth2Service: this._oauth2Service } = deps);
  }


  public async fetchMemberClusters(opts: {
    readonly fromTime: Date;
    readonly toTime: Date;
    readonly timeStepMs: number;
    readonly filterMemberIds: ReadonlyArray<string> | null;
    readonly filterSpaceIds: ReadonlyArray<string> | null;
  }): Promise<MemberClustersResult> {
    const {
      fromTime,
      toTime,
      timeStepMs,
      filterMemberIds,
      filterSpaceIds
    } = opts;

    const key = JSON.stringify({
      fromTime,
      toTime,
      timeStepMs,
      filterMemberIds,
      filterSpaceIds
    });

    return this._debouncer.debounce(`member-clusters:${key}`, async () => {
      const data = await this._oauth2Service
        .withAccessToken((token) => fetch(MemberClusterGlue.GetMemberClusters.createRequest({
          authentication: { token },
          body: {
            fromTime,
            toTime,
            timeStepMs,
            filterMemberIds,
            filterSpaceIds
          }
        })))
        .then(MemberClusterGlue.GetMemberClusters.handleResponse);
      return data;
    });
  }
}
