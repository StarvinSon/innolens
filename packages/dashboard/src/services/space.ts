import { injectableConstructor, singleton } from '@innolens/resolver/web';

import { stringTag } from '../utils/class';
import { Debouncer } from '../utils/debouncer';
import { PromiseValue } from '../utils/promise';

import { FileService } from './file';
import * as SpaceGlue from './glues/space';
import { OAuth2Service } from './oauth2';


export interface Space {
  readonly spaceId: string;
  readonly spaceName: string;
  readonly spaceCapacity: number;
}


export type SpaceCountCountType =
  Exclude<Parameters<typeof SpaceGlue.GetMemberCount.createRequest>[0]['query']['countType'], undefined>;

export type SpaceCountGroupBy =
  Exclude<Parameters<typeof SpaceGlue.GetMemberCount.createRequest>[0]['query']['groupBy'], undefined>;

export interface SpaceCount {
  readonly groups: ReadonlyArray<string>;
  readonly counts: SpaceCountRecordValues;
}

export interface SpaceCountRecordValues {
  readonly [group: string]: number;
}


export type SpaceMemberCountHistoryCountType =
  Exclude<Parameters<typeof SpaceGlue.GetMemberCountHistory.createRequest>[0]['query']['countType'], undefined>;

export type SpaceMemberCountHistoryGroupBy =
  Exclude<Parameters<typeof SpaceGlue.GetMemberCountHistory.createRequest>[0]['query']['groupBy'], undefined>;

export interface SpaceMemberCountHistory {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<SpaceCountHistoryRecord>;
}

export interface SpaceCountHistoryRecord {
  readonly startTime: Date;
  readonly endTime: Date;
  readonly counts: SpaceCountHistoryRecordValues;
}

export interface SpaceCountHistoryRecordValues {
  readonly [group: string]: number;
}


export type SpaceMemberCountHistory2CountType =
  Exclude<Parameters<typeof SpaceGlue.GetMemberCountHistory2.createRequest>[0]['body']['countType'], undefined>;

export type SpaceMemberCountHistory2GroupBy =
  Exclude<Parameters<typeof SpaceGlue.GetMemberCountHistory2.createRequest>[0]['body']['groupBy'], undefined>;

export type SpaceMemberCountHistory2 =
  PromiseValue<ReturnType<typeof SpaceGlue.GetMemberCountHistory2.handleResponse>>;


export type SpaceMemberCountForecastCountType =
  Exclude<Parameters<typeof SpaceGlue.GetMemberCountForecast.createRequest>[0]['body']['countType'], undefined>;

export type SpaceMemberCountForecastGroupBy =
  Exclude<Parameters<typeof SpaceGlue.GetMemberCountForecast.createRequest>[0]['body']['groupBy'], undefined>;

export type SpaceMemberCountForecast =
  PromiseValue<ReturnType<typeof SpaceGlue.GetMemberCountForecast.handleResponse>>;


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


  public async importSpaces(file: File): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(SpaceGlue.PostSpaces.createRequest({
        authentication: { token },
        body: { fileId }
      })))
      .then(SpaceGlue.PostSpaces.handleResponse);
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


  public async importAccessRecords(
    spaceId: string,
    deleteFromTime: Date | null,
    file: File
  ): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(SpaceGlue.PostAccessRecords.createRequest({
        authentication: { token },
        params: { spaceId },
        body: { deleteFromTime, fileId }
      })))
      .then(SpaceGlue.PostAccessRecords.handleResponse);
  }


  public async fetchMemberCount(
    time: Date,
    spaceIds: ReadonlyArray<string> | null,
    countType: SpaceCountCountType,
    groupBy: SpaceCountGroupBy | null
  ): Promise<SpaceCount> {
    const params = new URLSearchParams();
    params.set('time', time.toISOString());
    if (spaceIds !== null) params.set('spaceIds', spaceIds.map(encodeURIComponent).join(','));
    params.set('countType', countType);
    if (groupBy !== null) params.set('groupBy', groupBy);
    const key = params.toString();

    return this._debouncer.debounce(`count?${key}`, async () => {
      const data = await this._oauth2Service
        .withAccessToken((token) => fetch(SpaceGlue.GetMemberCount.createRequest({
          authentication: { token },
          query: {
            time,
            spaceIds: spaceIds ?? undefined,
            countType,
            groupBy: groupBy ?? undefined
          }
        })))
        .then(SpaceGlue.GetMemberCount.handleResponse);
      return data;
    });
  }

  public async fetchMemberCountHistory(
    fromTime: Date,
    toTime: Date,
    timeStepMs: number,
    spaceIds: ReadonlyArray<string> | null,
    countType: SpaceMemberCountHistoryCountType,
    groupBy: SpaceMemberCountHistoryGroupBy | null
  ): Promise<SpaceMemberCountHistory> {
    const params = new URLSearchParams();
    params.set('fromTime', fromTime.toISOString());
    params.set('toTime', toTime.toISOString());
    params.set('timeStepMs', String(timeStepMs));
    if (spaceIds !== null) params.set('spaceIds', spaceIds.map(encodeURIComponent).join(','));
    params.set('countType', countType);
    if (groupBy !== null) params.set('groupBy', groupBy);
    const key = params.toString();

    return this._debouncer.debounce(`count-history?${key}`, async () => {
      const data = await this._oauth2Service
        .withAccessToken((token) => fetch(SpaceGlue.GetMemberCountHistory.createRequest({
          authentication: { token },
          query: {
            fromTime,
            toTime,
            timeStepMs,
            filterSpaceIds: spaceIds ?? undefined,
            // filterMemberIds
            countType,
            groupBy: groupBy ?? undefined
          }
        })))
        .then(SpaceGlue.GetMemberCountHistory.handleResponse);
      return data;
    });
  }

  public async fetchMemberCountHistory2(opts: {
    readonly fromTime: Date;
    readonly toTime: Date;
    readonly timeStepMs?: number;
    readonly filterSpaceIds?: ReadonlyArray<string> | null;
    readonly countType?: SpaceMemberCountHistory2CountType;
    readonly groupBy?: SpaceMemberCountHistory2GroupBy;
  }): Promise<SpaceMemberCountHistory2> {
    const key = JSON.stringify(opts);

    return this._debouncer.debounce(`count-history:${key}`, async () => {
      const data = await this._oauth2Service
        .withAccessToken((token) => fetch(SpaceGlue.GetMemberCountHistory2.createRequest({
          authentication: { token },
          body: {
            fromTime: opts.fromTime,
            toTime: opts.toTime,
            timeStepMs: opts.timeStepMs,
            filterSpaceIds: opts.filterSpaceIds,
            // filterMemberIds
            countType: opts.countType,
            groupBy: opts.groupBy
          }
        })))
        .then(SpaceGlue.GetMemberCountHistory2.handleResponse);
      return data;
    });
  }


  public async fetchMemberCountForecast(opts: {
    readonly fromTime: Date;
    readonly timeStepMs?: 1800000;
    readonly filterSpaceIds?: ReadonlyArray<string> | null;
    readonly filterMemberIds?: ReadonlyArray<string> | null;
    readonly countType?: SpaceMemberCountForecastCountType;
    readonly groupBy?: SpaceMemberCountForecastGroupBy;
  }): Promise<SpaceMemberCountForecast> {
    const key = JSON.stringify(opts);

    return this._debouncer.debounce(`count-forecast:${key}`, async () => {
      const data = await this._oauth2Service
        .withAccessToken((token) => fetch(SpaceGlue.GetMemberCountForecast.createRequest({
          authentication: { token },
          body: {
            fromTime: opts.fromTime,
            timeStepMs: opts.timeStepMs,
            filterSpaceIds: opts.filterSpaceIds,
            filterMemberIds: opts.filterMemberIds,
            countType: opts.countType,
            groupBy: opts.groupBy
          }
        })))
        .then(SpaceGlue.GetMemberCountForecast.handleResponse);
      return data;
    });
  }
}
