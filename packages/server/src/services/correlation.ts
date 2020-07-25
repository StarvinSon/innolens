import { injectableConstructor, singleton } from '@innolens/resolver/lib-node';
import fetch from 'node-fetch';

import { ModelUri } from '../server-options';


export interface CorrelationResult {
  readonly offset: number;
  readonly corrcoef: number;
}

@injectableConstructor({
  modelsUri: ModelUri
})
@singleton()
export class CorrelationService {
  private readonly _modelsUri: ModelUri;

  public constructor(deps: {
    readonly modelsUri: ModelUri
  }) {
    ({
      modelsUri: this._modelsUri
    } = deps);
  }

  public async correlate(
    historyValueBatches: readonly [
      ReadonlyArray<number>,
      ReadonlyArray<number>
    ]
  ): Promise<CorrelationResult> {
    const res = await fetch(`${this._modelsUri}/correlate`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(historyValueBatches)
    });
    if (!res.ok) {
      throw new Error('correlation server responds not ok');
    }
    const resData = (await res.json()).data;
    return resData;
  }
}
