import { singleton, injectableConstructor } from '@innolens/resolver/node';
import fetch from 'node-fetch';


@injectableConstructor()
@singleton()
export class HistoryForecastService {

  public async predict(
    historyValueBatch: ReadonlyArray<ReadonlyArray<number>>
  ): Promise<ReadonlyArray<ReadonlyArray<number>>> {
    const res = await fetch('http://localhost:5000/forecast', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: historyValueBatch
      })
    });
    if (!res.ok) {
      throw new Error('forecast server responds not ok');
    }
    const resData = (await res.json()).data;
    return resData;
  }
}
