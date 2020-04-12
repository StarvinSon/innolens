import * as Api from '@innolens/api/legacy/web';
import { injectableConstructor, singleton } from '@innolens/resolver/web';

import { Debouncer } from './debouncer';
import { EffectQueue } from './effect-queue';
import { FileService } from './file';
import { ServerService, JsonBody } from './server';


export interface Space {
  readonly spaceId: string;
  readonly spaceName: string;
}

export const spaceMemberCountHistoryGroupByValues =
  Api.Spaces.GetSpaceMemberCountHistory.groupByQueryValues;

export type SpaceMemberCountHistoryGroupByValues =
  Api.Spaces.GetSpaceMemberCountHistory.GroupByQueryValue;

export interface SpaceMemberCountHistory {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<SpaceMemberCountRecord>;
}

export interface SpaceMemberCountRecord {
  readonly periodStartTime: Date;
  readonly periodEndTime: Date;
  readonly enterCounts: SpaceMemberCountRecordValues;
  readonly uniqueEnterCounts: SpaceMemberCountRecordValues;
  readonly exitCounts: SpaceMemberCountRecordValues;
  readonly uniqueExitCounts: SpaceMemberCountRecordValues;
  readonly stayCounts: SpaceMemberCountRecordValues;
  readonly uniqueStayCounts: SpaceMemberCountRecordValues;
}

export interface SpaceMemberCountRecordValues {
  readonly [group: string]: number;
}

@injectableConstructor({
  serverClient: ServerService,
  fileService: FileService
})
@singleton()
export class SpaceService extends EventTarget {
  private readonly _serverClient: ServerService;
  private readonly _fileService: FileService;

  private _spaces: ReadonlyArray<Space> | null = null;

  private _spaceMemberCountHistoryCache: {
    readonly spaceId: string;
    readonly groupBy: SpaceMemberCountHistoryGroupByValues;
    readonly pastHours: number;
    readonly data: SpaceMemberCountHistory | null
  } | null = null;

  private readonly _debouncer = new Debouncer();
  private readonly _effectQueue = new EffectQueue();


  public constructor(deps: {
    readonly serverClient: ServerService;
    readonly fileService: FileService;
  }) {
    super();
    ({
      serverClient: this._serverClient,
      fileService: this._fileService
    } = deps);
    if (process.env.NODE_ENV === 'development') {
      (globalThis as any).spaceService = this;
    }
  }


  public get spaces(): ReadonlyArray<Space> | null {
    return this._spaces;
  }

  public async importSpaces(file: File): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._serverClient.fetchOk(
      Api.Spaces.PostSpaces.path,
      {
        method: 'POST',
        body: new JsonBody(Api.Spaces.PostSpaces.toRequestBodyJson({
          fileId
        }))
      }
    );
  }

  public async updateSpaces(): Promise<ReadonlyArray<Space>> {
    return this._debouncer.performTask('spaces', async () => {
      const json = await this._serverClient.fetchJsonOk(
        Api.Spaces.GetSpaces.path,
        {
          cache: 'no-store'
        }
      );
      const { data } = Api.Spaces.GetSpaces.fromResponseBodyJson(json);
      this._spaces = data;
      Promise.resolve().then(() => this._notifyUpdated('spaces'));
      return data;
    });
  }


  public async importSpaceAccessRecords(
    spaceId: string,
    deleteFromTime: Date | null,
    deleteToTime: Date | null,
    file: File
  ): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._serverClient.fetchOk(
      Api.Spaces.PostSpaceAccessRecords.path(spaceId),
      {
        method: 'POST',
        body: new JsonBody(Api.Spaces.PostSpaceAccessRecords.toRequestBodyJson({
          deleteFromTime,
          deleteToTime,
          fileId
        }))
      }
    );
  }


  private _getSpaceMemberCountHistoryQuery(
    spaceId: string,
    groupBy: SpaceMemberCountHistoryGroupByValues,
    pastHours: number
  ): string {
    const params = new URLSearchParams();
    params.set('spaceId', spaceId);
    params.set('groupBy', groupBy);
    params.set('pastHours', String(pastHours));
    return params.toString();
  }

  public getSpaceMemberCountHistory(
    spaceId: string,
    groupBy: SpaceMemberCountHistoryGroupByValues,
    pastHours: number
  ): SpaceMemberCountHistory | null {
    if (
      this._spaceMemberCountHistoryCache !== null
      && this._spaceMemberCountHistoryCache.spaceId === spaceId
      && this._spaceMemberCountHistoryCache.groupBy === groupBy
      && this._spaceMemberCountHistoryCache.pastHours === pastHours
    ) {
      return this._spaceMemberCountHistoryCache.data;
    }
    return null;
  }

  public async updateSpaceMemberCountHistory(
    spaceId: string,
    groupBy: SpaceMemberCountHistoryGroupByValues,
    pastHours: number
  ): Promise<SpaceMemberCountHistory> {
    const query = this._getSpaceMemberCountHistoryQuery(spaceId, groupBy, pastHours);
    return this._debouncer.performTask(`history?${query}`, async () =>
      this._effectQueue.queue('history', async (applyEffect) => {
        const url = new URL(
          Api.Spaces.GetSpaceMemberCountHistory.path(spaceId),
          globalThis.location.href
        );
        url.search = query;
        const json = await this._serverClient.fetchJsonOk(
          url.href,
          {
            cache: 'no-store'
          }
        );
        const { data } = Api.Spaces.GetSpaceMemberCountHistory.fromResponseBodyJson(json);
        applyEffect(() => {
          this._spaceMemberCountHistoryCache = {
            spaceId,
            groupBy,
            pastHours,
            data
          };
          Promise.resolve().then(() => this._notifyUpdated('space-member-count-history'));
        });
        return data;
      }));
  }


  private _notifyUpdated(type: string): void {
    this.dispatchEvent(new Event(`${type}-updated`));
  }
}
