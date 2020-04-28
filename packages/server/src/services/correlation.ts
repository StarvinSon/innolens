import { injectableConstructor, singleton } from '@innolens/resolver/node';
import fetch from 'node-fetch';


export interface CorrelationResult {
  readonly offset: number;
  readonly corrcoef: number;
}

@injectableConstructor()
@singleton()
export class CorrelationService {
  public async correlate(
    historyValueBatches: readonly [
      ReadonlyArray<number>,
      ReadonlyArray<number>
    ]
  ): Promise<CorrelationResult> {
    const res = await fetch('http://localhost:5000/correlate', {
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
