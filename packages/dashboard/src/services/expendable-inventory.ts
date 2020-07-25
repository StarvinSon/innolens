import { injectableConstructor, singleton } from '@innolens/resolver/lib-web';

import { stringTag } from '../utils/class';
import { Debouncer } from '../utils/debouncer';
import { PromiseValue } from '../utils/promise';

import { FileService } from './file';
import * as ExpendableInventoryGlue from './glues/expendable-inventory';
import { OAuth2Service } from './oauth2';


export type ExpendableInventoryType =
  PromiseValue<ReturnType<typeof ExpendableInventoryGlue.GetTypes.handleResponse>>[number];


export type ExpendableInventoryQuantityHistoryGroupBy =
  Exclude<Parameters<typeof ExpendableInventoryGlue.GetQuantityHistory.createRequest>[0]['body']['groupBy'], undefined>;

export type ExpendableInventoryQuantityHistoryCountType =
  Exclude<Parameters<typeof ExpendableInventoryGlue.GetQuantityHistory.createRequest>[0]['body']['countType'], undefined>;

export type ExpendableInventoryQuantityHistory =
  PromiseValue<ReturnType<typeof ExpendableInventoryGlue.GetQuantityHistory.handleResponse>>;


export interface ExpendableInventoryQuantityHistoryLegacy {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<ExpendableInventoryQuantityRecordLegacy>;
}

export interface ExpendableInventoryQuantityRecordLegacy {
  readonly time: Date;
  readonly counts: {
    readonly [group: string]: number;
  }
}


export type ExpendableInventoryQuantityForecastGroupBy =
  Exclude<Parameters<typeof ExpendableInventoryGlue.GetQuantityForecast.createRequest>[0]['body']['groupBy'], undefined>;

export type ExpendableInventoryQuantityForecastCountType =
  Exclude<Parameters<typeof ExpendableInventoryGlue.GetQuantityForecast.createRequest>[0]['body']['countType'], undefined>;

export type ExpendableInventoryQuantityForecast =
  PromiseValue<ReturnType<typeof ExpendableInventoryGlue.GetQuantityForecast.handleResponse>>;


@injectableConstructor({
  oauth2Service: OAuth2Service,
  fileService: FileService
})
@singleton()
@stringTag()
export class ExpendableInventoryService {
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
      (globalThis as any).expendableInventoryService = this;
    }
  }


  public async fetchTypes(): Promise<ReadonlyArray<ExpendableInventoryType>> {
    return this._debouncer.debounce('types', async () => {
      const resData = await this._oauth2Service
        .withAccessToken((token) => fetch(ExpendableInventoryGlue.GetTypes.createRequest({
          authentication: { token }
        })))
        .then(ExpendableInventoryGlue.GetTypes.handleResponse);
      return resData;
    });
  }

  public async importTypes(file: File): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(ExpendableInventoryGlue.ImportTypes.createRequest({
        authentication: { token },
        body: { fileId }
      })))
      .then(ExpendableInventoryGlue.ImportTypes.handleResponse);
  }


  public async importAccessRecords(
    typeId: string,
    deleteFromTime: Date | null,
    file: File
  ): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(ExpendableInventoryGlue.ImportAccessRecords
        .createRequest({
          params: { typeId },
          authentication: { token },
          body: {
            deleteFromTime,
            fileId
          }
        })))
      .then(ExpendableInventoryGlue.ImportAccessRecords.handleResponse);
  }


  public async fetchQuantityHistory(opts: {
    readonly fromTime: Date,
    readonly toTime: Date,
    readonly timeStepMs: number,
    readonly filterTypeIds: ReadonlyArray<string> | null,
    readonly groupBy: ExpendableInventoryQuantityHistoryGroupBy,
    readonly countType: ExpendableInventoryQuantityHistoryCountType
  }): Promise<ExpendableInventoryQuantityHistory> {
    const key = JSON.stringify(opts);
    return this._debouncer.debounce(`quantity-history:${key}`, async () =>
      this._oauth2Service
        .withAccessToken((token) => fetch(ExpendableInventoryGlue.GetQuantityHistory
          .createRequest({
            authentication: { token },
            body: {
              fromTime: opts.fromTime,
              toTime: opts.toTime,
              timeStepMs: opts.timeStepMs,
              filterTypeIds: opts.filterTypeIds,
              groupBy: opts.groupBy,
              countType: opts.countType
            }
          })))
        .then(ExpendableInventoryGlue.GetQuantityHistory.handleResponse));
  }

  public async fetchQuantityHistoryLegacy(
    fromTime: Date,
    toTime: Date,
    timeStepMs: number,
    filterTypeIds: ReadonlyArray<string> | null,
    groupBy: ExpendableInventoryQuantityHistoryGroupBy
  ): Promise<ExpendableInventoryQuantityHistoryLegacy> {
    const history = await this.fetchQuantityHistory({
      fromTime,
      toTime,
      timeStepMs,
      filterTypeIds,
      groupBy,
      countType: 'quantity'
    });
    return {
      groups: history.groups,
      records: history.timeSpans.map(([, periodEndTime], t) => ({
        time: periodEndTime,
        counts: Object.fromEntries(history.groups.map((group) =>
          [group, history.values[history.groups.indexOf(group)][t]]))
      }))
    };
  }

  public async fetchQuantityForecast(opts: {
    readonly fromTime: Date,
    readonly timeStepMs: number,
    readonly filterTypeIds: ReadonlyArray<string> | null,
    readonly groupBy: ExpendableInventoryQuantityForecastGroupBy,
    readonly countType: ExpendableInventoryQuantityForecastCountType
  }): Promise<ExpendableInventoryQuantityForecast> {
    const key = JSON.stringify(opts);
    return this._debouncer.debounce(`quantity-forecast:${key}`, async () =>
      this._oauth2Service
        .withAccessToken((token) => fetch(ExpendableInventoryGlue.GetQuantityForecast
          .createRequest({
            authentication: { token },
            body: {
              fromTime: opts.fromTime,
              timeStepMs: opts.timeStepMs,
              filterTypeIds: opts.filterTypeIds,
              groupBy: opts.groupBy,
              countType: opts.countType
            }
          })))
        .then(ExpendableInventoryGlue.GetQuantityForecast.handleResponse));
  }
}
