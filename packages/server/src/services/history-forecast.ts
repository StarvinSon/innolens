import { singleton, injectableConstructor } from '@innolens/resolver/lib-node';
import { subWeeks, addDays } from 'date-fns';
import fetch from 'node-fetch';

import { Logger } from '../logger';
import { ModelUri } from '../server-options';


@injectableConstructor({
  modelsUri: ModelUri,
  logger: Logger
})
@singleton()
export class HistoryForecastService {
  private readonly _modelsUri: ModelUri;
  private readonly _logger: Logger;

  public constructor(deps: {
    readonly modelsUri: ModelUri;
    readonly logger: Logger;
  }) {
    ({
      modelsUri: this._modelsUri,
      logger: this._logger
    } = deps);
  }


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
    const res = await fetch(`${this._modelsUri}/forecast`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: historyValueBatch
      })
    });
    if (!res.ok) {
      res.json()
        .then((data) => {
          this._logger.error('Model server responded: %O', data);
        });
      throw new Error('forecast server responds not ok');
    }
    const resData = (await res.json()).data;
    return resData;
  }
}
