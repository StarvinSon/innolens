import { injectableConstructor, singleton } from '@innolens/resolver/web';

import { stringTag } from '../utils/class';
import { Debouncer } from '../utils/debouncer';

import { EffectQueue } from './effect-queue';
import { FileService } from './file';
import * as ReusableInventoryGlue from './glues/reusable-inventory';
import { OAuth2Service } from './oauth2';


const computeKey = (name: string, params: Readonly<Record<string, string>>): string =>
  `${name}?${new URLSearchParams(params).toString()}`;


export interface ReusableInventoryType {
  readonly typeId: string;
  readonly typeName: string;
}

export interface ReusableInventoryInstance {
  readonly instanceId: string;
  readonly instanceName: string;
}


export type ReusableInventoryMemberCountHistoryGroupBy =
  'department'
  | 'typeOfStudy'
  | 'studyProgramme'
  | 'yearOfStudy'
  | 'affiliatedStudentInterestGroup';


export type ReusableInventoryMemberCountType =
  'acquireCounts'
  | 'uniqueAcquireCounts'
  | 'releaseCounts'
  | 'uniqueReleaseCounts'
  | 'useCounts'
  | 'uniqueUseCounts';


export interface ReusableInventoryMemberCountHistory {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<ReusableInventoryMemberCountRecord>;
}

export interface ReusableInventoryMemberCountRecord {
  readonly periodStartTime: Date;
  readonly periodEndTime: Date;
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
export class ReusableInventoryService extends EventTarget {
  private readonly _oauth2Service: OAuth2Service;
  private readonly _fileService: FileService;

  private _typesCache: ReadonlyArray<ReusableInventoryType> | null = null;

  private _instancesCache: {
    readonly typeId: string;
    readonly data: ReadonlyArray<ReusableInventoryInstance>;
  } | null = null;

  private _reusableInventoryMemberCountHistoryCache: {
    readonly key: string;
    readonly data: ReusableInventoryMemberCountHistory | null
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
      (globalThis as any).reusableInventoryService = this;
    }
  }


  public get types(): ReadonlyArray<ReusableInventoryType> | null {
    return this._typesCache;
  }

  public async updateTypes(): Promise<ReadonlyArray<ReusableInventoryType>> {
    return this._debouncer.debounce('types', async () => {
      const resData = await this._oauth2Service
        .withAccessToken((token) => fetch(ReusableInventoryGlue.GetTypes.createRequest({
          authentication: { token }
        })))
        .then(ReusableInventoryGlue.GetTypes.handleResponse);

      this._typesCache = resData;
      Promise.resolve().then(() => this._notifyUpdated('types'));
      return resData;
    });
  }

  public async importTypes(file: File): Promise<void> {
    const fileId = await this._fileService.upload(file);
    await this._oauth2Service
      .withAccessToken((token) => fetch(ReusableInventoryGlue.PostTypes.createRequest({
        authentication: { token },
        body: { fileId }
      })))
      .then(ReusableInventoryGlue.PostTypes.handleResponse);
  }


  public getInstances(typeId: string): ReadonlyArray<ReusableInventoryInstance> | null {
    if (this._instancesCache !== null && this._instancesCache.typeId === typeId) {
      return this._instancesCache.data;
    }
    return null;
  }

  public async updateInstances(typeId: string): Promise<ReadonlyArray<ReusableInventoryInstance>> {
    const key = computeKey('instances', {
      typeId
    });
    return this._debouncer.debounce(key, async () =>
      this._effectQueue.queue('instances', async (applyEffect) => {
        const resData = await this._oauth2Service
          .withAccessToken((token) => fetch(ReusableInventoryGlue.GetInstances.createRequest({
            params: { typeId },
            authentication: { token }
          })))
          .then(ReusableInventoryGlue.GetInstances.handleResponse);
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
      .withAccessToken((token) => fetch(ReusableInventoryGlue.PostInstances.createRequest({
        params: { typeId },
        authentication: { token },
        body: { fileId }
      })))
      .then(ReusableInventoryGlue.PostInstances.handleResponse);
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
      .withAccessToken((token) => fetch(ReusableInventoryGlue.PostInstanceAccessRecords
        .createRequest({
          params: { typeId, instanceId },
          authentication: { token },
          body: { deleteFromTime, deleteToTime, fileId }
        })))
      .then(ReusableInventoryGlue.PostInstanceAccessRecords.handleResponse);
  }


  private _getMemberCountHistoryKey(
    pastHours: number,
    typeIds: ReadonlyArray<string> | undefined,
    instanceIds: ReadonlyArray<string> | undefined,
    groupBy: ReusableInventoryMemberCountHistoryGroupBy | undefined,
    countType: ReusableInventoryMemberCountType | undefined
  ): string {
    const params = new URLSearchParams();
    params.set('pastHours', String(pastHours));
    if (typeIds !== undefined) params.set('typeId', typeIds.map(encodeURIComponent).join(','));
    if (instanceIds !== undefined) params.set('instanceId', instanceIds.map(encodeURIComponent).join(','));
    if (groupBy !== undefined) params.set('groupBy', groupBy);
    if (countType !== undefined) params.set('countType', countType);
    return params.toString();
  }

  public getMemberCountHistory(
    pastHours: number,
    typeIds: ReadonlyArray<string> | undefined,
    instanceIds: ReadonlyArray<string> | undefined,
    groupBy: ReusableInventoryMemberCountHistoryGroupBy | undefined,
    countType: ReusableInventoryMemberCountType | undefined
  ): ReusableInventoryMemberCountHistory | null {
    const key = this._getMemberCountHistoryKey(pastHours, typeIds, instanceIds, groupBy, countType);
    if (
      this._reusableInventoryMemberCountHistoryCache !== null
      && this._reusableInventoryMemberCountHistoryCache.key === key
    ) {
      return this._reusableInventoryMemberCountHistoryCache.data;
    }
    return null;
  }

  public async updateMemberCountHistory(
    pastHours: number,
    typeIds: ReadonlyArray<string> | undefined,
    instanceIds: ReadonlyArray<string> | undefined,
    groupBy: ReusableInventoryMemberCountHistoryGroupBy | undefined,
    countType: ReusableInventoryMemberCountType | undefined
  ): Promise<ReusableInventoryMemberCountHistory> {
    const key = this._getMemberCountHistoryKey(pastHours, typeIds, instanceIds, groupBy, countType);
    return this._debouncer.debounce(`history?${key}`, async () =>
      this._effectQueue.queue('history', async (applyEffect) => {
        const resData = await this._oauth2Service
          .withAccessToken((token) => fetch(ReusableInventoryGlue.GetMemberCountHistory
            .createRequest({
              query: {
                pastHours,
                typeIds,
                instanceIds,
                groupBy,
                countType
              },
              authentication: { token }
            })))
          .then(ReusableInventoryGlue.GetMemberCountHistory.handleResponse);
        applyEffect(() => {
          this._reusableInventoryMemberCountHistoryCache = {
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
