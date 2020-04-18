import { injectableConstructor, singleton } from '@innolens/resolver/web';

import { stringTag } from '../utils/class';
import { Debouncer } from '../utils/debouncer';

import { FileService } from './file';
import * as SpaceGlue from './glues/space';
import { OAuth2Service } from './oauth2';


export interface Space {
  readonly spaceId: string;
  readonly spaceName: string;
}


export type SpaceCountCountType =
  Exclude<Parameters<typeof SpaceGlue.GetCount.createRequest>[0]['query']['countType'], undefined>;

export type SpaceCountGroupBy =
  Exclude<Parameters<typeof SpaceGlue.GetCount.createRequest>[0]['query']['groupBy'], undefined>;

export interface SpaceCount {
  readonly groups: ReadonlyArray<string>;
  readonly counts: SpaceCountRecordValues;
}

export interface SpaceCountRecordValues {
  readonly [group: string]: number;
}


export type SpaceCountHistoryCountType =
  Exclude<Parameters<typeof SpaceGlue.GetCountHistory.createRequest>[0]['query']['countType'], undefined>;

export type SpaceCountHistoryGroupBy =
  Exclude<Parameters<typeof SpaceGlue.GetCountHistory.createRequest>[0]['query']['groupBy'], undefined>;

export interface SpaceCountHistory {
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


  public async fetchCount(
    time: Date,
    spaceIds: ReadonlyArray<string> | null,
    countType: SpaceCountCountType,
    groupBy: SpaceCountGroupBy
  ): Promise<SpaceCount> {
    const params = new URLSearchParams();
    params.set('time', time.toISOString());
    if (spaceIds !== null) params.set('spaceIds', spaceIds.map(encodeURIComponent).join(','));
    params.set('countType', countType);
    params.set('groupBy', groupBy);
    const key = params.toString();

    return this._debouncer.debounce(`count?${key}`, async () => {
      const data = await this._oauth2Service
        .withAccessToken((token) => fetch(SpaceGlue.GetCount.createRequest({
          authentication: { token },
          query: {
            time,
            spaceIds: spaceIds ?? undefined,
            countType,
            groupBy
          }
        })))
        .then(SpaceGlue.GetCount.handleResponse);
      return data;
    });
  }

  public async fetchCountHistory(
    fromTime: Date,
    toTime: Date,
    timeStepMs: number,
    spaceIds: ReadonlyArray<string> | null,
    countType: SpaceCountHistoryCountType,
    groupBy: SpaceCountHistoryGroupBy | null
  ): Promise<SpaceCountHistory> {
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
        .withAccessToken((token) => fetch(SpaceGlue.GetCountHistory.createRequest({
          authentication: { token },
          query: {
            fromTime,
            toTime,
            timeStepMs,
            spaceIds: spaceIds ?? undefined,
            countType,
            groupBy: groupBy ?? undefined
          }
        })))
        .then(SpaceGlue.GetCountHistory.handleResponse);
      return data;
    });
  }
}
