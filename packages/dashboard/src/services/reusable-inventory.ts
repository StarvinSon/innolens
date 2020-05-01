import { injectableConstructor, singleton } from '@innolens/resolver/web';
import { subHours } from 'date-fns';

import { stringTag } from '../utils/class';
import { Debouncer } from '../utils/debouncer';
import { deprecated } from '../utils/method-deprecator';
import { PromiseValue } from '../utils/promise';

import { FileService } from './file';
import * as ReusableInventoryGlue from './glues/reusable-inventory';
import { OAuth2Service } from './oauth2';


export type ReusableInventoryType =
  PromiseValue<ReturnType<typeof ReusableInventoryGlue.GetTypes.handleResponse>>[number];

export type ReusableInventoryInstance =
  PromiseValue<ReturnType<typeof ReusableInventoryGlue.GetInstances.handleResponse>>[number];


export type ReusableInventoryMemberCountHistoryGroupBy =
  Exclude<Parameters<typeof ReusableInventoryGlue.GetMemberCountHistory.createRequest>[0]['body']['groupBy'], undefined>;

export type ReusableInventoryMemberCountHistoryCountType =
  Exclude<Parameters<typeof ReusableInventoryGlue.GetMemberCountHistory.createRequest>[0]['body']['countType'], undefined>;

export type ReusableInventoryMemberCountHistory =
  PromiseValue<ReturnType<typeof ReusableInventoryGlue.GetMemberCountHistory.handleResponse>>;


export type ReusableInventoryMemberCountForecastGroupBy =
  Exclude<Parameters<typeof ReusableInventoryGlue.GetMemberCountForecast.createRequest>[0]['body']['groupBy'], undefined>;

export type ReusableInventoryMemberCountForecastCountType =
  Exclude<Parameters<typeof ReusableInventoryGlue.GetMemberCountForecast.createRequest>[0]['body']['countType'], undefined>;

export type ReusableInventoryMemberCountForecast =
  PromiseValue<ReturnType<typeof ReusableInventoryGlue.GetMemberCountForecast.handleResponse>>;


export type ReusableInventoryCorrelationCountType =
  Exclude<Parameters<typeof ReusableInventoryGlue.GetCorrelation.createRequest>[0]['body']['countType'], undefined>;

export type ReusableInventoryCorrelation =
  PromiseValue<ReturnType<typeof ReusableInventoryGlue.GetCorrelation.handleResponse>>;


export interface ReusableInventoryMemberCountHistoryLegacy {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<ReusableInventoryMemberCountRecordLegacy>;
}

export interface ReusableInventoryMemberCountRecordLegacy {
  readonly periodStartTime: Date;
  readonly periodEndTime: Date;
  readonly counts: {
    readonly [group: string]: number;
  }
}

const legacyToTime = new Date();


@injectableConstructor({
  oauth2Service: OAuth2Service,
  fileService: FileService
})
@singleton()
@stringTag()
export class ReusableInventoryService {
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
      (globalThis as any).reusableInventoryService = this;
    }
  }


  public async fetchTypes(): Promise<ReadonlyArray<ReusableInventoryType>> {
    return this._debouncer.debounce('types', async () => {
      const resData = await this._oauth2Service
        .withAccessToken((token) => fetch(ReusableInventoryGlue.GetTypes.createRequest({
          authentication: { token }
        })))
        .then(ReusableInventoryGlue.GetTypes.handleResponse);
      return resData;
    });
  }

  public async importTypes(file: File): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(ReusableInventoryGlue.ImportTypes.createRequest({
        authentication: { token },
        body: { fileId }
      })))
      .then(ReusableInventoryGlue.ImportTypes.handleResponse);
  }


  public async fetchInstances(typeId: string): Promise<ReadonlyArray<ReusableInventoryInstance>> {
    const key = JSON.stringify({
      typeId
    });

    return this._debouncer.debounce(`instances:${key}`, async () => {
      const resData = await this._oauth2Service
        .withAccessToken((token) => fetch(ReusableInventoryGlue.GetInstances.createRequest({
          params: { typeId },
          authentication: { token }
        })))
        .then(ReusableInventoryGlue.GetInstances.handleResponse);
      return resData;
    });
  }

  public async importInstances(typeId: string, file: File): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(ReusableInventoryGlue.ImportInstances.createRequest({
        params: { typeId },
        authentication: { token },
        body: { fileId }
      })))
      .then(ReusableInventoryGlue.ImportInstances.handleResponse);
  }

  public async importInstanceAccessRecords(opts: {
    readonly typeId: string;
    readonly instanceId: string;
    readonly deleteFromTime: Date | null;
    readonly file: File;
  }): Promise<void> {
    const fileId = await this._fileService.upload(opts.file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(ReusableInventoryGlue.ImportInstanceAccessRecords
        .createRequest({
          params: {
            typeId: opts.typeId,
            instanceId: opts.instanceId
          },
          authentication: { token },
          body: {
            deleteFromTime: opts.deleteFromTime,
            fileId
          }
        })))
      .then(ReusableInventoryGlue.ImportInstanceAccessRecords.handleResponse);
  }


  public async fetchMemberCountHistory(opts: {
    readonly fromTime: Date;
    readonly toTime: Date;
    readonly timeStepMs: number;
    readonly filterTypeIds: ReadonlyArray<string> | null;
    readonly filterInstanceIds: ReadonlyArray<string> | null;
    readonly groupBy: ReusableInventoryMemberCountHistoryGroupBy;
    readonly countType: ReusableInventoryMemberCountHistoryCountType;
  }): Promise<ReusableInventoryMemberCountHistory> {
    const key = JSON.stringify(opts);

    return this._debouncer.debounce(`member-count-history:${key}`, async () => {
      const resData = await this._oauth2Service
        .withAccessToken((token) => fetch(ReusableInventoryGlue.GetMemberCountHistory
          .createRequest({
            authentication: { token },
            body: {
              fromTime: opts.fromTime,
              toTime: opts.toTime,
              timeStepMs: opts.timeStepMs,
              filterTypeIds: opts.filterTypeIds,
              filterInstanceIds: opts.filterInstanceIds,
              groupBy: opts.groupBy,
              countType: opts.countType
            }
          })))
        .then(ReusableInventoryGlue.GetMemberCountHistory.handleResponse);
      return resData;
    });
  }

  @deprecated()
  public async updateMemberCountHistoryLegacy(
    pastHours: number,
    typeIds: ReadonlyArray<string> | undefined,
    instanceIds: ReadonlyArray<string> | undefined,
    groupBy: ReusableInventoryMemberCountHistoryGroupBy | undefined,
    countType: ReusableInventoryMemberCountHistoryCountType | undefined
  ): Promise<ReusableInventoryMemberCountHistoryLegacy> {
    const toTime = legacyToTime;
    const fromTime = subHours(toTime, pastHours);
    const key = JSON.stringify({
      fromTime,
      toTime,
      typeIds,
      instanceIds,
      groupBy,
      countType
    });

    return this._debouncer.debounce(`update-member-count-history-legacy:${key}`, async () => {
      const history = await this.fetchMemberCountHistory({
        fromTime,
        toTime,
        timeStepMs: 30 * 60 * 1000,
        filterTypeIds: typeIds ?? null,
        filterInstanceIds: instanceIds ?? null,
        groupBy: groupBy ?? null,
        countType: countType ?? 'use'
      });
      return {
        groups: history.groups,
        records: history.timeSpans.map(([startTime, endTime], t) => ({
          periodStartTime: startTime,
          periodEndTime: endTime,
          counts: Object.fromEntries(history.groups.map((group, g) =>
            [group, history.values[g][t]]))
        }))
      };
    });
  }

  public async fetchMemberCountForecast(opts: {
    readonly fromTime: Date;
    readonly filterTypeIds: ReadonlyArray<string> | null;
    readonly filterInstanceIds: ReadonlyArray<string> | null;
    readonly groupBy: ReusableInventoryMemberCountForecastGroupBy;
    readonly countType: ReusableInventoryMemberCountForecastCountType;
  }): Promise<ReusableInventoryMemberCountForecast> {
    const key = JSON.stringify(opts);

    return this._debouncer.debounce(`member-count-forecast:${key}`, async () => {
      const resData = await this._oauth2Service
        .withAccessToken((token) => fetch(ReusableInventoryGlue.GetMemberCountForecast
          .createRequest({
            authentication: { token },
            body: {
              fromTime: opts.fromTime,
              filterTypeIds: opts.filterTypeIds,
              filterInstanceIds: opts.filterInstanceIds,
              groupBy: opts.groupBy,
              countType: opts.countType
            }
          })))
        .then(ReusableInventoryGlue.GetMemberCountForecast.handleResponse);
      return resData;
    });
  }

  public async fetchCorrelation(opts: {
    readonly fromTime: Date;
    readonly timeStepMs?: 7200000;
    readonly filterTypeIds: ReadonlyArray<string>;
    readonly countType?: ReusableInventoryCorrelationCountType;
  }): Promise<ReusableInventoryCorrelation> {
    const key = JSON.stringify(opts);

    return this._debouncer.debounce(`correlation:${key}`, async () => {
      const data = await this._oauth2Service
        .withAccessToken((token) => fetch(ReusableInventoryGlue.GetCorrelation.createRequest({
          authentication: { token },
          body: {
            fromTime: opts.fromTime,
            timeStepMs: opts.timeStepMs,
            filterTypeIds: opts.filterTypeIds,
            countType: opts.countType
          }
        })))
        .then(ReusableInventoryGlue.GetCorrelation.handleResponse);
      return data;
    });
  }
}
