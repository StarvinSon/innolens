import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { addHours, subMilliseconds } from 'date-fns';
import fetch from 'node-fetch';

import { Logger } from '../logger';

import { SpaceService } from './space';
import { timeSpanRange } from './time';


export class InvalidAccessCausalityInputFeaturesHistory extends Error {}


export interface AccessCausalityFeaturesHistory {
  readonly startTimes: ReadonlyArray<Date>;
  readonly endTimes: ReadonlyArray<Date>;
  readonly features: ReadonlyArray<string>;
  readonly values: ReadonlyArray<ReadonlyArray<number>>;
}


export interface AccessCausalityInputFeaturesHistory {
  readonly startTimes: ReadonlyArray<Date>;
  readonly endTimes: ReadonlyArray<Date>;
  readonly features: ReadonlyArray<string>;
  readonly values: ReadonlyArray<ReadonlyArray<number>>;
}

export interface AccessCausalityFeatureForecast {
  readonly startTimes: ReadonlyArray<Date>;
  readonly endTimes: ReadonlyArray<Date>;
  readonly features: ReadonlyArray<string>;
  readonly values: ReadonlyArray<ReadonlyArray<number>>;
}


@injectableConstructor({
  spaceService: SpaceService,
  logger: Logger
})
@singleton()
export class AccessCausalityService {
  private readonly _spaceService: SpaceService;
  private readonly _logger: Logger;

  public constructor(deps: {
    readonly spaceService: SpaceService;
    readonly logger: Logger;
  }) {
    ({
      spaceService: this._spaceService,
      logger: this._logger
    } = deps);
  }


  private async _getModelSettings(): Promise<{
    readonly features: ReadonlyArray<string>;
    readonly historyWindowSize: number;
    readonly forecastWindowSize: number;
    readonly timeStepMs: number;
  }> {
    const res = await fetch('http://localhost:5000/access-causality/settings');
    if (!res.ok) {
      res.json()
        .then((data) => {
          this._logger.error('Model server responded: %O', data);
        });
      throw new Error('access causality server responds not ok');
    }
    return (await res.json()).data;
  }

  public async getFeaturesHistory(opts: {
    readonly fromTime?: Date;
    readonly toTime: Date;
    readonly timeStepMs?: number;
  }): Promise<AccessCausalityFeaturesHistory> {
    const { toTime } = opts;

    const settings = await this._getModelSettings();
    const timeStepMs = opts.timeStepMs ?? settings.timeStepMs;
    const fromTime = opts.fromTime
      ?? subMilliseconds(toTime, timeStepMs * settings.historyWindowSize);
    const { features } = settings;

    const spaceMemberHistory = await this._spaceService.getMemberCountHistory({
      fromTime,
      toTime,
      timeStepMs,
      filterSpaceIds: null,
      countType: 'stay',
      groupBy: 'space'
    });

    const [startTimes, endTimes] = timeSpanRange(fromTime, toTime, timeStepMs);
    const values = features.map((spaceId) => {
      const spaceIdx = spaceMemberHistory.groups.indexOf(spaceId);
      return spaceIdx < 0
        ? endTimes.map(() => 0)
        : spaceMemberHistory.values[spaceIdx];
    });

    return {
      startTimes,
      endTimes,
      features,
      values
    };
  }

  public async getFeaturesForecast(
    history: AccessCausalityInputFeaturesHistory
  ): Promise<AccessCausalityFeatureForecast> {
    const settings = await this._getModelSettings();

    if (
      history.startTimes.length !== settings.historyWindowSize
      || history.endTimes.length !== settings.historyWindowSize
      || history.values.some((ts) => ts.length !== settings.historyWindowSize)
    ) {
      throw new InvalidAccessCausalityInputFeaturesHistory(
        `All input time series must have length ${settings.historyWindowSize}`
      );
    }
    for (let i = 0; i < settings.historyWindowSize - 1; i += 1) {
      if (
        (history.startTimes[i + 1].getTime() - history.startTimes[i].getTime()) !== settings.timeStepMs // eslint-disable-line max-len
        || (history.endTimes[i + 1].getTime() - history.endTimes[i].getTime()) !== settings.timeStepMs // eslint-disable-line max-len
      ) {
        throw new InvalidAccessCausalityInputFeaturesHistory(
          `All input time step must be equals to ${settings.timeStepMs}`
        );
      }
    }

    const res = await fetch('http://localhost:5000/access-causality', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        features: history.features,
        values: history.values
      })
    });
    if (!res.ok) {
      res.json()
        .then((data) => {
          this._logger.error('Model server responded: %O', data);
        });
      throw new Error('access causality server responds not ok');
    }
    const resData = (await res.json()).data;

    const [startTimes, endTimes] = timeSpanRange(
      history.endTimes[settings.historyWindowSize - 1],
      addHours(history.endTimes[settings.historyWindowSize - 1], 1),
      settings.timeStepMs
    );

    return {
      startTimes,
      endTimes,
      features: resData.features,
      values: resData.values
    };
  }
}
