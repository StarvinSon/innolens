import { injectableConstructor, singleton } from '@innolens/resolver/web';

import { stringTag } from '../utils/class';
import { Debouncer } from '../utils/debouncer';

import { EffectQueue } from './effect-queue';
import { FileService } from './file';
import * as ExpendableInventoryGlue from './glues/expendable-inventory';
import { OAuth2Service } from './oauth2';


export const expendableInventoryTypeCapacity: Readonly<Record<string, number>> = {
  wood_plank: 100
};

export interface ExpendableInventoryType {
  readonly typeId: string;
  readonly typeName: string;
}


export type ExpendableInventoryData<T> = {
  readonly type: 'successful';
  readonly data: T;
} | {
  readonly type: 'failed';
  readonly errorMessage: string;
} | {
  readonly type: 'none';
};

const noData: Extract<ExpendableInventoryData<never>, { type: 'none' }> = { type: 'none' };


type ExpendableInventoryDataCache<T> = {
  readonly type: 'cached';
  readonly key: string;
  readonly result: ExpendableInventoryDataCacheResult<T>;
} | {
  readonly type: 'empty';
};

type ExpendableInventoryDataCacheResult<T> = {
  readonly type: 'successful';
  readonly data: T;
} | {
  readonly type: 'failed';
  readonly errorMessage: string;
};

const emptyCache: Extract<ExpendableInventoryDataCache<never>, { type: 'empty' }> = { type: 'empty' };


export type ExpendableInventoryQuantityHistoryGroupBy =
  Exclude<Parameters<typeof ExpendableInventoryGlue.GetQuantityHistory.createRequest>[0]['query']['groupBy'], undefined>;

export interface ExpendableInventoryQuantityHistory {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<ExpendableInventoryQuantityRecord>;
}

export interface ExpendableInventoryQuantityRecord {
  readonly time: Date;
  readonly counts: {
    readonly [group: string]: number;
  }
}


export type ExpendableInventoryAccessHistoryGroupBy =
  Exclude<Parameters<typeof ExpendableInventoryGlue.GetAccessHistory.createRequest>[0]['query']['groupBy'], undefined>;

export type ExpendableInventoryAccessHistoryCountType =
  Exclude<Parameters<typeof ExpendableInventoryGlue.GetAccessHistory.createRequest>[0]['query']['countType'], undefined>;

export interface ExpendableInventoryAccessHistory {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<ExpendableInventoryAccessRecord>;
}

export interface ExpendableInventoryAccessRecord {
  readonly startTime: Date;
  readonly endTime: Date;
  readonly counts: {
    readonly [group: string]: number;
  }
}


@injectableConstructor({
  oauth2Service: OAuth2Service,
  fileService: FileService
})
@singleton()
@stringTag()
export class ExpendableInventoryService extends EventTarget {
  private readonly _oauth2Service: OAuth2Service;
  private readonly _fileService: FileService;

  private _typesCache: ReadonlyArray<ExpendableInventoryType> | null = null;

  // eslint-disable-next-line max-len
  private _quantityHistoryCache: ExpendableInventoryDataCache<ExpendableInventoryQuantityHistory> = emptyCache;

  // eslint-disable-next-line max-len
  private _accessHistoryCache: ExpendableInventoryDataCache<ExpendableInventoryAccessHistory> = emptyCache;

  private readonly _debouncer = new Debouncer();
  private readonly _effectQueue = new EffectQueue();


  public constructor(deps: {
    readonly oauth2Service: OAuth2Service;
    readonly fileService: FileService;
  }) {
    super();
    ({
      oauth2Service: this._oauth2Service,
      fileService: this._fileService
    } = deps);
    if (process.env.NODE_ENV === 'development') {
      (globalThis as any).expendableInventoryService = this;
    }
  }


  public get types(): ReadonlyArray<ExpendableInventoryType> | null {
    return this._typesCache;
  }

  public async updateTypes(): Promise<ReadonlyArray<ExpendableInventoryType>> {
    return this._debouncer.debounce('types', async () => {
      const resData = await this._oauth2Service
        .withAccessToken((token) => fetch(ExpendableInventoryGlue.GetTypes.createRequest({
          authentication: { token }
        })))
        .then(ExpendableInventoryGlue.GetTypes.handleResponse);

      this._typesCache = resData;
      Promise.resolve().then(() => this._notifyUpdated('types'));
      return resData;
    });
  }

  public async importTypes(file: File): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(ExpendableInventoryGlue.PostTypes.createRequest({
        authentication: { token },
        body: { fileId }
      })))
      .then(ExpendableInventoryGlue.PostTypes.handleResponse);
  }


  public async importQuantitySetAndAccessRecords(
    typeId: string,
    deleteFromTime: Date | null,
    deleteToTime: Date | null,
    quantitySetRecordsFile: File,
    accessRecordsFile: File
  ): Promise<void> {
    const [quantitySetRecordsFileId, accessRecordsFileId] = await Promise.all([
      this._fileService.upload(quantitySetRecordsFile),
      this._fileService.upload(accessRecordsFile)
    ]);
    await this._oauth2Service
      .withAccessToken((token) => fetch(ExpendableInventoryGlue.PostQuantitySetAndAccessRecords
        .createRequest({
          params: { typeId },
          authentication: { token },
          body: {
            deleteFromTime,
            deleteToTime,
            quantitySetRecordsFileId,
            accessRecordsFileId
          }
        })))
      .then(ExpendableInventoryGlue.PostQuantitySetAndAccessRecords.handleResponse);
  }


  private _getQuantityHistoryKey(
    startTime: Date,
    endTime: Date,
    timeStepMs: number,
    typeIds: ReadonlyArray<string> | undefined,
    groupBy: ExpendableInventoryQuantityHistoryGroupBy | undefined
  ): string {
    const params = new URLSearchParams();
    params.set('startTime', startTime.toISOString());
    params.set('endTime', endTime.toISOString());
    params.set('timeStepMs', String(timeStepMs));
    if (typeIds !== undefined) params.set('typeIds', typeIds.map(encodeURIComponent).join(','));
    if (groupBy !== undefined) params.set('groupBy', groupBy);
    return params.toString();
  }

  public getQuantityHistory(
    startTime: Date,
    endTime: Date,
    timeStepMs: number,
    typeIds: ReadonlyArray<string> | undefined,
    groupBy: ExpendableInventoryQuantityHistoryGroupBy | undefined
  ): ExpendableInventoryData<ExpendableInventoryQuantityHistory> {
    const key = this._getQuantityHistoryKey(startTime, endTime, timeStepMs, typeIds, groupBy);
    if (
      this._quantityHistoryCache.type === 'cached'
      && this._quantityHistoryCache.key === key
    ) {
      return this._quantityHistoryCache.result;
    }
    return noData;
  }

  public async fetchQuantityHistory(
    startTime: Date,
    endTime: Date,
    timeStepMs: number,
    typeIds: ReadonlyArray<string> | undefined,
    groupBy: ExpendableInventoryQuantityHistoryGroupBy | undefined
  ): Promise<ExpendableInventoryQuantityHistory> {
    const key = this._getQuantityHistoryKey(startTime, endTime, timeStepMs, typeIds, groupBy);
    return this._debouncer.debounce(`quantity?${key}`, async () =>
      this._effectQueue.queue('quantity', async (applyEffect) => {
        let result: ExpendableInventoryDataCacheResult<ExpendableInventoryQuantityHistory>;
        try {
          const data = await this._oauth2Service
            .withAccessToken((token) => fetch(ExpendableInventoryGlue.GetQuantityHistory
              .createRequest({
                query: {
                  startTime,
                  endTime,
                  timeStepMs,
                  typeIds,
                  groupBy
                },
                authentication: { token }
              })))
            .then(ExpendableInventoryGlue.GetQuantityHistory.handleResponse);
          result = {
            type: 'successful',
            data
          };
          return data;
        } catch (err) {
          result = {
            type: 'failed',
            errorMessage: String(err)
          };
          throw err;
        } finally {
          applyEffect(() => {
            this._quantityHistoryCache = {
              key,
              type: 'cached',
              result
            };
            Promise.resolve().then(() => this._notifyUpdated('quantity-history'));
          });
        }
      }));
  }


  private _getAccessHistoryKey(
    startTime: Date,
    endTime: Date,
    timeStepMs: number,
    typeIds: ReadonlyArray<string> | undefined,
    groupBy: ExpendableInventoryAccessHistoryGroupBy | undefined,
    countType: ExpendableInventoryAccessHistoryCountType | undefined
  ): string {
    const params = new URLSearchParams();
    params.set('startTime', startTime.toISOString());
    params.set('endTime', endTime.toISOString());
    params.set('timeStepMs', String(timeStepMs));
    if (typeIds !== undefined) params.set('typeId', typeIds.map(encodeURIComponent).join(','));
    if (groupBy !== undefined) params.set('groupBy', groupBy);
    if (countType !== undefined) params.set('countType', countType);
    return params.toString();
  }

  public getAccessHistory(
    startTime: Date,
    endTime: Date,
    timeStepMs: number,
    typeIds: ReadonlyArray<string> | undefined,
    groupBy: ExpendableInventoryAccessHistoryGroupBy | undefined,
    countType: ExpendableInventoryAccessHistoryCountType | undefined
  ): ExpendableInventoryData<ExpendableInventoryAccessHistory> {
    const key = this._getAccessHistoryKey(
      startTime, endTime, timeStepMs,
      typeIds, groupBy, countType
    );
    if (
      this._accessHistoryCache.type === 'cached'
      && this._accessHistoryCache.key === key
    ) {
      return this._accessHistoryCache.result;
    }
    return noData;
  }

  public async fetchAccessHistory(
    startTime: Date,
    endTime: Date,
    timeStepMs: number,
    typeIds: ReadonlyArray<string> | undefined,
    groupBy: ExpendableInventoryAccessHistoryGroupBy | undefined,
    countType: ExpendableInventoryAccessHistoryCountType | undefined
  ): Promise<ExpendableInventoryAccessHistory> {
    const key = this._getAccessHistoryKey(
      startTime, endTime, timeStepMs,
      typeIds, groupBy, countType
    );
    return this._debouncer.debounce(`access?${key}`, async () =>
      this._effectQueue.queue('access', async (applyEffect) => {
        let result: ExpendableInventoryDataCacheResult<ExpendableInventoryAccessHistory>;
        try {
          const data = await this._oauth2Service
            .withAccessToken((token) => fetch(ExpendableInventoryGlue.GetAccessHistory
              .createRequest({
                query: {
                  startTime,
                  endTime,
                  timeStepMs,
                  typeIds,
                  groupBy,
                  countType
                },
                authentication: { token }
              })))
            .then(ExpendableInventoryGlue.GetAccessHistory.handleResponse);
          result = {
            type: 'successful',
            data
          };
          return data;
        } catch (err) {
          result = {
            type: 'failed',
            errorMessage: String(err)
          };
          throw err;
        } finally {
          applyEffect(() => {
            this._accessHistoryCache = {
              key,
              type: 'cached',
              result
            };
            Promise.resolve().then(() => this._notifyUpdated('access-history'));
          });
        }
      }));
  }


  private _notifyUpdated(type: string): void {
    this.dispatchEvent(new Event(`${type}-updated`));
  }
}
