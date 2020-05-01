import { injectableConstructor, singleton } from '@innolens/resolver/web';
import { subHours } from 'date-fns';

import { stringTag } from '../utils/class';
import { Debouncer } from '../utils/debouncer';
import { deprecated } from '../utils/method-deprecator';
import { PromiseValue } from '../utils/promise';

import { FileService } from './file';
import * as MachineGlue from './glues/machine';
import { OAuth2Service } from './oauth2';


export type MachineType =
  PromiseValue<ReturnType<typeof MachineGlue.GetTypes.handleResponse>>[number];

export type MachineInstance =
  PromiseValue<ReturnType<typeof MachineGlue.GetInstances.handleResponse>>[number];


export type MachineMemberCountHistoryGroupBy =
  Exclude<Parameters<typeof MachineGlue.GetMemberCountHistory.createRequest>[0]['body']['groupBy'], undefined>;

export type MachineMemberCountHistoryCountType =
  Exclude<Parameters<typeof MachineGlue.GetMemberCountHistory.createRequest>[0]['body']['countType'], undefined>;

export type MachineMemberCountHistory =
  PromiseValue<ReturnType<typeof MachineGlue.GetMemberCountHistory.handleResponse>>;


export type MachineMemberCountForecastGroupBy =
  Exclude<Parameters<typeof MachineGlue.GetMemberCountForecast.createRequest>[0]['body']['groupBy'], undefined>;

export type MachineMemberCountForecastCountType =
  Exclude<Parameters<typeof MachineGlue.GetMemberCountForecast.createRequest>[0]['body']['countType'], undefined>;

export type MachineMemberCountForecast =
  PromiseValue<ReturnType<typeof MachineGlue.GetMemberCountForecast.handleResponse>>;


export type MachineCorrelationCountType =
  Exclude<Parameters<typeof MachineGlue.GetCorrelation.createRequest>[0]['body']['countType'], undefined>;

export type MachineCorrelation =
  PromiseValue<ReturnType<typeof MachineGlue.GetCorrelation.handleResponse>>;


export interface MachineMemberCountHistoryLegacy {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<MachineMemberCountRecordLegacy>;
  readonly timeSpans: ReadonlyArray<readonly [Date, Date]>;
}

export interface MachineMemberCountRecordLegacy {
  readonly periodStartTime: Date;
  readonly periodEndTime: Date;
  readonly acquireCounts: MachineMemberCountRecordValuesLegacy;
  readonly uniqueAcquireCounts: MachineMemberCountRecordValuesLegacy;
  readonly releaseCounts: MachineMemberCountRecordValuesLegacy;
  readonly uniqueReleaseCounts: MachineMemberCountRecordValuesLegacy;
  readonly useCounts: MachineMemberCountRecordValuesLegacy;
  readonly uniqueUseCounts: MachineMemberCountRecordValuesLegacy;
}

export interface MachineMemberCountRecordValuesLegacy {
  readonly [group: string]: number;
}

const legacyToTime = new Date();


@injectableConstructor({
  oauth2Service: OAuth2Service,
  fileService: FileService
})
@singleton()
@stringTag()
export class MachineService {
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
      (globalThis as any).machineService = this;
    }
  }


  public async fetchTypes(): Promise<ReadonlyArray<MachineType>> {
    return this._debouncer.debounce('types', async () => {
      const resData = await this._oauth2Service
        .withAccessToken((token) => fetch(MachineGlue.GetTypes.createRequest({
          authentication: { token }
        })))
        .then(MachineGlue.GetTypes.handleResponse);
      return resData;
    });
  }

  public async importTypes(file: File): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(MachineGlue.ImportTypes.createRequest({
        authentication: { token },
        body: { fileId }
      })))
      .then(MachineGlue.ImportTypes.handleResponse);
  }


  public async fetchInstances(typeId: string): Promise<ReadonlyArray<MachineInstance>> {
    const key = JSON.stringify({
      typeId
    });

    return this._debouncer.debounce(`instances:${key}`, async () => {
      const resData = await this._oauth2Service
        .withAccessToken((token) => fetch(MachineGlue.GetInstances.createRequest({
          params: { typeId },
          authentication: { token }
        })))
        .then(MachineGlue.GetInstances.handleResponse);
      return resData;
    });
  }

  public async importInstances(typeId: string, file: File): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(MachineGlue.ImportInstances.createRequest({
        params: { typeId },
        authentication: { token },
        body: { fileId }
      })))
      .then(MachineGlue.ImportInstances.handleResponse);
  }

  public async importInstanceAccessRecords(opts: {
    readonly typeId: string;
    readonly instanceId: string;
    readonly deleteFromTime: Date | null;
    readonly file: File;
  }): Promise<void> {
    const fileId = await this._fileService.upload(opts.file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(MachineGlue.ImportInstanceAccessRecords
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
      .then(MachineGlue.ImportInstanceAccessRecords.handleResponse);
  }


  public async fetchMemberCountHistory(opts: {
    readonly fromTime: Date;
    readonly toTime: Date;
    readonly timeStepMs: number;
    readonly filterTypeIds: ReadonlyArray<string> | null;
    readonly filterInstanceIds: ReadonlyArray<string> | null;
    readonly groupBy: MachineMemberCountHistoryGroupBy;
    readonly countType: MachineMemberCountHistoryCountType;
  }): Promise<MachineMemberCountHistory> {
    const key = JSON.stringify(opts);

    return this._debouncer.debounce(`member-count-history:${key}`, async () => {
      const resData = await this._oauth2Service
        .withAccessToken((token) => fetch(MachineGlue.GetMemberCountHistory
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
        .then(MachineGlue.GetMemberCountHistory.handleResponse);
      return resData;
    });
  }

  @deprecated()
  public async updateMemberCountHistoryLegacy(
    filterTypeIds: ReadonlyArray<string> | undefined,
    filterInstanceIds: ReadonlyArray<string> | undefined,
    groupBy: MachineMemberCountHistoryGroupBy,
    pastHours: number
  ): Promise<MachineMemberCountHistoryLegacy> {
    const toTime = legacyToTime;
    const fromTime = subHours(toTime, pastHours);
    const timeStepMs = 30 * 60 * 1000;
    const key = JSON.stringify({
      fromTime,
      toTime,
      timeStepMs,
      filterTypeIds,
      filterInstanceIds,
      groupBy
    });

    return this._debouncer.debounce(`update-member-count-history-legacy:${key}`, async () => {
      const legacyCountTypes = [
        ['acquireCounts', 'acquire'],
        ['uniqueAcquireCounts', 'uniqueAcquire'],
        ['releaseCounts', 'release'],
        ['uniqueReleaseCounts', 'uniqueRelease'],
        ['useCounts', 'use'],
        ['uniqueUseCounts', 'uniqueUse']
      ] as const;

      const histories = new Map(await Promise.all(
        legacyCountTypes.map(async ([legacyCountType, countType]) => {
          const history = await this.fetchMemberCountHistory({
            fromTime,
            toTime,
            timeStepMs,
            filterTypeIds: filterTypeIds ?? null,
            filterInstanceIds: filterInstanceIds ?? null,
            groupBy,
            countType
          });
          return [legacyCountType, history] as const;
        })
      ));

      const { timeSpans } = histories.get('useCounts')!;
      const groups = Array.from(new Set(
        Array.from(histories.values()).flatMap((history) => history.groups)
      ));
      const records = timeSpans.map(([periodStartTime, periodEndTime], t) => ({
        periodStartTime,
        periodEndTime,
        ...Object.fromEntries(legacyCountTypes.map(([legacyCountType]) => {
          const history = histories.get(legacyCountType)!;
          const groupValues = Object.fromEntries(groups.map((group) => {
            const g = history.groups.indexOf(group);
            const value = g < 0
              ? 0
              : history.values[g][t];
            return [group, value];
          }));
          return [legacyCountType, groupValues];
        })) as Record<'acquireCounts' | 'uniqueAcquireCounts' | 'releaseCounts' | 'uniqueReleaseCounts' | 'useCounts' | 'uniqueUseCounts', MachineMemberCountRecordValuesLegacy>
      }));

      return {
        timeSpans,
        groups,
        records
      };
    });
  }

  public async fetchMemberCountForecast(opts: {
    readonly fromTime: Date;
    readonly filterTypeIds: ReadonlyArray<string> | null;
    readonly filterInstanceIds: ReadonlyArray<string> | null;
    readonly groupBy: MachineMemberCountForecastGroupBy;
    readonly countType: MachineMemberCountForecastCountType;
  }): Promise<MachineMemberCountForecast> {
    const key = JSON.stringify(opts);

    return this._debouncer.debounce(`member-count-forecast:${key}`, async () => {
      const resData = await this._oauth2Service
        .withAccessToken((token) => fetch(MachineGlue.GetMemberCountForecast
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
        .then(MachineGlue.GetMemberCountForecast.handleResponse);
      return resData;
    });
  }

  public async fetchCorrelation(opts: {
    readonly fromTime: Date;
    readonly timeStepMs?: 7200000;
    readonly filterTypeIds: ReadonlyArray<string>;
    readonly countType?: MachineCorrelationCountType;
  }): Promise<MachineCorrelation> {
    const key = JSON.stringify(opts);

    return this._debouncer.debounce(`correlation:${key}`, async () => {
      const data = await this._oauth2Service
        .withAccessToken((token) => fetch(MachineGlue.GetCorrelation.createRequest({
          authentication: { token },
          body: {
            fromTime: opts.fromTime,
            timeStepMs: opts.timeStepMs,
            filterTypeIds: opts.filterTypeIds,
            countType: opts.countType
          }
        })))
        .then(MachineGlue.GetCorrelation.handleResponse);
      return data;
    });
  }
}
