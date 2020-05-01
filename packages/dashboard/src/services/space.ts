import { injectableConstructor, singleton } from '@innolens/resolver/web';
import { addMilliseconds } from 'date-fns';

import { stringTag } from '../utils/class';
import { Debouncer } from '../utils/debouncer';
import { deprecated } from '../utils/method-deprecator';
import { PromiseValue } from '../utils/promise';

import { FileService } from './file';
import * as SpaceGlue from './glues/space';
import { OAuth2Service } from './oauth2';


export type Space =
  PromiseValue<ReturnType<typeof SpaceGlue.GetSpaces.handleResponse>>[number];


export type SpaceMemberCountHistoryGroupBy =
  Exclude<Parameters<typeof SpaceGlue.GetMemberCountHistory.createRequest>[0]['body']['groupBy'], undefined>;

export type SpaceMemberCountHistoryCountType =
  Exclude<Parameters<typeof SpaceGlue.GetMemberCountHistory.createRequest>[0]['body']['countType'], undefined>;


export type SpaceMemberCountHistory =
  PromiseValue<ReturnType<typeof SpaceGlue.GetMemberCountHistory.handleResponse>>;


export interface SpaceCountLegacy {
  readonly groups: ReadonlyArray<string>;
  readonly counts: SpaceCountRecordValuesLegacy;
}

export interface SpaceCountRecordValuesLegacy {
  readonly [group: string]: number;
}


export interface SpaceMemberCountHistoryLegacy {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<SpaceCountHistoryRecordLegacy>;
}

export interface SpaceCountHistoryRecordLegacy {
  readonly startTime: Date;
  readonly endTime: Date;
  readonly counts: SpaceCountHistoryRecordValuesLegacy;
}

export interface SpaceCountHistoryRecordValuesLegacy {
  readonly [group: string]: number;
}

export type SpaceMemberCountForecastCountType =
  Exclude<Parameters<typeof SpaceGlue.GetMemberCountForecast.createRequest>[0]['body']['countType'], undefined>;

export type SpaceMemberCountForecastGroupBy =
  Exclude<Parameters<typeof SpaceGlue.GetMemberCountForecast.createRequest>[0]['body']['groupBy'], undefined>;

export type SpaceMemberCountForecast =
  PromiseValue<ReturnType<typeof SpaceGlue.GetMemberCountForecast.handleResponse>>;


export type SpaceCorrelationCountType =
  Exclude<Parameters<typeof SpaceGlue.GetCorrelation.createRequest>[0]['body']['countType'], undefined>;

export type SpaceCorrelation =
  PromiseValue<ReturnType<typeof SpaceGlue.GetCorrelation.handleResponse>>;

@injectableConstructor({
  oauth2Service: OAuth2Service,
  fileService: FileService
})
@singleton()
@stringTag()
export class SpaceService {
  private readonly _oauth2Service: OAuth2Service;
  private readonly _fileService: FileService;

  private readonly _debouncer = new Debouncer();


  public constructor(deps: {
    readonly oauth2Service: OAuth2Service;
    readonly fileService: FileService;
  }) {
    ({
      oauth2Service: this._oauth2Service,
      fileService: this._fileService
    } = deps);
    if (process.env.NODE_ENV === 'development') {
      (globalThis as any).spaceService = this;
    }
  }


  public async fetchSpaces(): Promise<ReadonlyArray<Space>> {
    return this._debouncer.debounce('spaces', async () => {
      const data = await this._oauth2Service
        .withAccessToken((token) => fetch(SpaceGlue.GetSpaces.createRequest({
          authentication: { token }
        })))
        .then(SpaceGlue.GetSpaces.handleResponse);
      return data;
    });
  }

  public async importSpaces(file: File): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(SpaceGlue.ImportSpaces.createRequest({
        authentication: { token },
        body: { fileId }
      })))
      .then(SpaceGlue.ImportSpaces.handleResponse);
  }

  public async importAccessRecords(opts: {
    readonly spaceId: string;
    readonly deleteFromTime: Date | null;
    readonly file: File;
  }): Promise<void> {
    const fileId = await this._fileService.upload(opts.file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(SpaceGlue.ImportAccessRecords.createRequest({
        authentication: { token },
        params: {
          spaceId: opts.spaceId
        },
        body: {
          deleteFromTime: opts.deleteFromTime,
          fileId
        }
      })))
      .then(SpaceGlue.ImportAccessRecords.handleResponse);
  }


  public async fetchMemberCountHistory(opts: {
    readonly fromTime: Date;
    readonly toTime: Date;
    readonly timeStepMs: number;
    readonly filterSpaceIds: ReadonlyArray<string> | null;
    readonly groupBy: SpaceMemberCountHistoryGroupBy;
    readonly countType: SpaceMemberCountHistoryCountType;
  }): Promise<SpaceMemberCountHistory> {
    const key = JSON.stringify(opts);

    return this._debouncer.debounce(`member-count-history:${key}`, async () => {
      const data = await this._oauth2Service
        .withAccessToken((token) => fetch(SpaceGlue.GetMemberCountHistory.createRequest({
          authentication: { token },
          body: {
            fromTime: opts.fromTime,
            toTime: opts.toTime,
            timeStepMs: opts.timeStepMs,
            filterSpaceIds: opts.filterSpaceIds,
            countType: opts.countType,
            groupBy: opts.groupBy
          }
        })))
        .then(SpaceGlue.GetMemberCountHistory.handleResponse);
      return data;
    });
  }

  @deprecated()
  public async fetchMemberCountLegacy(
    time: Date,
    filterSpaceIds: ReadonlyArray<string> | null,
    countType: 'total' | 'uniqueMember',
    groupBy: SpaceMemberCountHistoryGroupBy | null
  ): Promise<SpaceCountLegacy> {
    const key = JSON.stringify({
      time,
      filterSpaceIds,
      countType,
      groupBy
    });

    return this._debouncer.debounce(`member-count-legacy:${key}`, async () => {
      const history = await this.fetchMemberCountHistory({
        fromTime: time,
        toTime: addMilliseconds(time, 1),
        timeStepMs: 1,
        filterSpaceIds,
        groupBy: 'space',
        countType: 'stay'
      });

      return {
        groups: history.groups,
        counts: Object.fromEntries(history.groups.map((group, g) => [
          group,
          history.values[g][0]
        ]))
      };
    });
  }

  @deprecated()
  public async fetchMemberCountHistoryLegacy(
    fromTime: Date,
    toTime: Date,
    timeStepMs: number,
    filterSpaceIds: ReadonlyArray<string> | null,
    groupBy: SpaceMemberCountHistoryGroupBy,
    countType: SpaceMemberCountHistoryCountType
  ): Promise<SpaceMemberCountHistoryLegacy> {
    const key = JSON.stringify({
      fromTime,
      toTime,
      timeStepMs,
      filterSpaceIds,
      groupBy,
      countType
    });

    return this._debouncer.debounce(`member-count-history-legacy:${key}`, async () => {
      const history = await this.fetchMemberCountHistory({
        fromTime,
        toTime,
        timeStepMs,
        filterSpaceIds,
        groupBy,
        countType
      });

      return {
        groups: history.groups,
        records: history.timeSpans.map(([startTime, endTime], t) => ({
          startTime,
          endTime,
          counts: Object.fromEntries(history.groups.map((group, g) => [
            group,
            history.values[g][t]
          ]))
        }))
      };
    });
  }

  public async fetchMemberCountForecast(opts: {
    readonly fromTime: Date;
    readonly filterSpaceIds: ReadonlyArray<string> | null;
    readonly groupBy: SpaceMemberCountForecastGroupBy;
    readonly countType?: SpaceMemberCountForecastCountType;
  }): Promise<SpaceMemberCountForecast> {
    const key = JSON.stringify(opts);

    return this._debouncer.debounce(`member-count-forecast:${key}`, async () => {
      const data = await this._oauth2Service
        .withAccessToken((token) => fetch(SpaceGlue.GetMemberCountForecast.createRequest({
          authentication: { token },
          body: {
            fromTime: opts.fromTime,
            filterSpaceIds: opts.filterSpaceIds,
            countType: opts.countType,
            groupBy: opts.groupBy
          }
        })))
        .then(SpaceGlue.GetMemberCountForecast.handleResponse);
      return data;
    });
  }

  public async fetchCorrelation(opts: {
    readonly fromTime: Date;
    readonly timeStepMs?: 7200000;
    readonly filterSpaceIds: ReadonlyArray<string>;
    readonly countType?: SpaceCorrelationCountType;
  }): Promise<SpaceCorrelation> {
    const key = JSON.stringify(opts);

    return this._debouncer.debounce(`correlation:${key}`, async () => {
      const data = await this._oauth2Service
        .withAccessToken((token) => fetch(SpaceGlue.GetCorrelation.createRequest({
          authentication: { token },
          body: {
            fromTime: opts.fromTime,
            timeStepMs: opts.timeStepMs,
            filterSpaceIds: opts.filterSpaceIds,
            countType: opts.countType
          }
        })))
        .then(SpaceGlue.GetCorrelation.handleResponse);
      return data;
    });
  }
}
