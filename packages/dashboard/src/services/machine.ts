import { injectableConstructor, singleton } from '@innolens/resolver/web';

import { stringTag } from '../utils/class';
import { Debouncer } from '../utils/debouncer';

import { EffectQueue } from './effect-queue';
import { FileService } from './file';
import * as MachineGlue from './glues/machine';
import { OAuth2Service } from './oauth2';


const computeKey = (name: string, params: Readonly<Record<string, string>>): string =>
  `${name}?${new URLSearchParams(params).toString()}`;


export interface MachineType {
  readonly typeId: string;
  readonly typeName: string;
}

export interface MachineInstance {
  readonly instanceId: string;
  readonly instanceName: string;
}


export const machineMemberCountHistoryGroupByValues = [
  'all',
  'department',
  'typeOfStudy',
  'studyProgramme',
  'yearOfStudy',
  'affiliatedStudentInterestGroup'
] as const;

export type MachineMemberCountHistoryGroupByValues =
  (typeof machineMemberCountHistoryGroupByValues)[number];

export interface MachineMemberCountHistory {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<MachineMemberCountRecord>;
}

export interface MachineMemberCountRecord {
  readonly periodStartTime: Date;
  readonly periodEndTime: Date;
  readonly acquireCounts: MachineMemberCountRecordValues;
  readonly uniqueAcquireCounts: MachineMemberCountRecordValues;
  readonly releaseCounts: MachineMemberCountRecordValues;
  readonly uniqueReleaseCounts: MachineMemberCountRecordValues;
  readonly useCounts: MachineMemberCountRecordValues;
  readonly uniqueUseCounts: MachineMemberCountRecordValues;
}

export interface MachineMemberCountRecordValues {
  readonly [group: string]: number;
}


@injectableConstructor({
  oauth2Service: OAuth2Service,
  fileService: FileService
})
@singleton()
@stringTag()
export class MachineService extends EventTarget {
  private readonly _oauth2Service: OAuth2Service;
  private readonly _fileService: FileService;

  private _typesCache: ReadonlyArray<MachineType> | null = null;

  private _instancesCache: {
    readonly typeId: string;
    readonly data: ReadonlyArray<MachineInstance>;
  } | null = null;

  private _machineMemberCountHistoryCache: {
    readonly key: string;
    readonly data: MachineMemberCountHistory | null
  } | null = null;

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
      (globalThis as any).machineService = this;
    }
  }


  public get types(): ReadonlyArray<MachineType> | null {
    return this._typesCache;
  }

  public async updateTypes(): Promise<ReadonlyArray<MachineType>> {
    return this._debouncer.debounce('types', async () => {
      const resData = await this._oauth2Service
        .withAccessToken((token) => fetch(MachineGlue.GetTypes.createRequest({
          authentication: { token }
        })))
        .then(MachineGlue.GetTypes.handleResponse);

      this._typesCache = resData;
      Promise.resolve().then(() => this._notifyUpdated('types'));
      return resData;
    });
  }

  public async importTypes(file: File): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(MachineGlue.PostTypes.createRequest({
        authentication: { token },
        body: { fileId }
      })))
      .then(MachineGlue.PostTypes.handleResponse);
  }


  public getInstances(typeId: string): ReadonlyArray<MachineInstance> | null {
    if (this._instancesCache !== null && this._instancesCache.typeId === typeId) {
      return this._instancesCache.data;
    }
    return null;
  }

  public async updateInstances(typeId: string): Promise<ReadonlyArray<MachineInstance>> {
    const key = computeKey('instances', {
      typeId
    });
    return this._debouncer.debounce(key, async () =>
      this._effectQueue.queue('instances', async (applyEffect) => {
        const resData = await this._oauth2Service
          .withAccessToken((token) => fetch(MachineGlue.GetInstances.createRequest({
            params: { typeId },
            authentication: { token }
          })))
          .then(MachineGlue.GetInstances.handleResponse);
        applyEffect(() => {
          this._instancesCache = {
            typeId,
            data: resData
          };
          Promise.resolve().then(() => this._notifyUpdated('types'));
        });
        return resData;
      }));
  }

  public async importInstances(typeId: string, file: File): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(MachineGlue.PostInstances.createRequest({
        params: { typeId },
        authentication: { token },
        body: { fileId }
      })))
      .then(MachineGlue.PostInstances.handleResponse);
  }

  public async importInstanceAccessRecords(
    typeId: string,
    instanceId: string,
    deleteFromTime: Date | null,
    deleteToTime: Date | null,
    file: File
  ): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(MachineGlue.PostInstanceAccessRecords.createRequest({
        params: { typeId, instanceId },
        authentication: { token },
        body: { deleteFromTime, deleteToTime, fileId }
      })))
      .then(MachineGlue.PostInstanceAccessRecords.handleResponse);
  }


  private _getMemberCountHistoryKey(
    typeIds: ReadonlyArray<string> | undefined,
    instanceIds: ReadonlyArray<string> | undefined,
    groupBy: MachineMemberCountHistoryGroupByValues,
    pastHours: number
  ): string {
    const params = new URLSearchParams();
    if (typeIds !== undefined) params.set('typeId', typeIds.map(encodeURIComponent).join(','));
    if (instanceIds !== undefined) params.set('instanceId', instanceIds.map(encodeURIComponent).join(','));
    params.set('groupBy', groupBy);
    params.set('pastHours', String(pastHours));
    return params.toString();
  }

  public getMemberCountHistory(
    typeIds: ReadonlyArray<string> | undefined,
    instanceIds: ReadonlyArray<string> | undefined,
    groupBy: MachineMemberCountHistoryGroupByValues,
    pastHours: number
  ): MachineMemberCountHistory | null {
    const key = this._getMemberCountHistoryKey(typeIds, instanceIds, groupBy, pastHours);
    if (
      this._machineMemberCountHistoryCache !== null
      && this._machineMemberCountHistoryCache.key === key
    ) {
      return this._machineMemberCountHistoryCache.data;
    }
    return null;
  }

  public async updateMemberCountHistory(
    typeIds: ReadonlyArray<string> | undefined,
    instanceIds: ReadonlyArray<string> | undefined,
    groupBy: MachineMemberCountHistoryGroupByValues,
    pastHours: number
  ): Promise<MachineMemberCountHistory> {
    const key = this._getMemberCountHistoryKey(typeIds, instanceIds, groupBy, pastHours);
    return this._debouncer.debounce(`history?${key}`, async () =>
      this._effectQueue.queue('history', async (applyEffect) => {
        const resData = await this._oauth2Service
          .withAccessToken((token) => fetch(MachineGlue.GetMemberCountHistory.createRequest({
            query: {
              typeIds,
              instanceIds,
              groupBy,
              pastHours
            },
            authentication: { token }
          })))
          .then(MachineGlue.GetMemberCountHistory.handleResponse);
        applyEffect(() => {
          this._machineMemberCountHistoryCache = {
            key,
            data: resData
          };
          Promise.resolve().then(() => this._notifyUpdated('member-count-history'));
        });
        return resData;
      }));
  }


  private _notifyUpdated(type: string): void {
    this.dispatchEvent(new Event(`${type}-updated`));
  }
}
