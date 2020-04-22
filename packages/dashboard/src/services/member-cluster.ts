import { injectableConstructor, singleton } from '@innolens/resolver/web';

import { stringTag } from '../utils/class';
import { Debouncer } from '../utils/debouncer';

import * as MemberClusterGlue from './glues/member-cluster';
import { generateKey } from './key';
import { OAuth2Service } from './oauth2';


type ExtractPromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

// eslint-disable-next-line max-len
export type MemberClusterResult = ExtractPromise<ReturnType<typeof MemberClusterGlue.GetMemberCluster.handleResponse>>;


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


  public async fetchMemberCluster(opts: {
    readonly fromTime: Date,
    readonly toTime: Date,
    readonly timeStepMs: number,
    readonly filter?: {
      readonly memberIds?: ReadonlyArray<string>
    }
  }): Promise<MemberClusterResult> {
    const key = generateKey({
      fromTime: opts.fromTime.toISOString(),
      toTime: opts.toTime.toISOString(),
      timeStepMs: String(opts.timeStepMs),
      filterMemberIds: opts.filter?.memberIds?.map(encodeURIComponent).join(',')
    });

    return this._debouncer.debounce(`fetchMemberCluster?${key}`, async () => {
      const data = await this._oauth2Service
        .withAccessToken((token) => fetch(MemberClusterGlue.GetMemberCluster.createRequest({
          query: {
            fromTime: opts.fromTime,
            toTime: opts.toTime,
            timeStepMs: opts.timeStepMs,
            filterMemberIds: opts.filter?.memberIds
          },
          authentication: { token }
        })))
        .then(MemberClusterGlue.GetMemberCluster.handleResponse);
      return data;
    });
  }
}
