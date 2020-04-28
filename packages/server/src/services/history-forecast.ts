import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { subWeeks, addDays } from 'date-fns';
import fetch from 'node-fetch';


@injectableConstructor()
@singleton()
export class HistoryForecastService {

  public getHistoryFromTime(toTime: Date): Date {
    return subWeeks(toTime, 2);
  }

  public getForecastToTime(fromTime: Date): Date {
    return addDays(fromTime, 2);
  }

  public readonly timeStepMs = 30 * 60 * 1000;


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
