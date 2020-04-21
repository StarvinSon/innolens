import { injectableConstructor, singleton } from '@innolens/resolver/web';

import { stringTag } from '../utils/class';
import { Debouncer } from '../utils/debouncer';

import { FileService } from './file';
import * as SpaceGlue from './glues/space';
import { OAuth2Service } from './oauth2';


export const spaceCapacity: Readonly<Record<string, number>> = {
  common_workspace_area_1: 40,
  common_workspace_area_2: 40,
  machine_room: 40,
  electronic_workbenches: 40,
  laser_cutting_room: 40,
  open_event_area: 40,
  event_hall_a: 40,
  event_hall_b: 40,
  ar_vr_room: 40,
  brainstorming_area: 40,
  multi_purpose_room: 40,
  Meeting_Room_1: 40,
  meeting_room_2: 40,
  workshop_1: 40,
  workshop_2: 40,
  workshop_3: 40,
  workshop_4: 40,
  workshop_5: 40,
  workshop_6: 40,
  workshop_7: 40,
  workshop_8: 40,
  workshop_9: 40
};

export interface Space {
  readonly spaceId: string;
  readonly spaceName: string;
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


export type SpaceCountHistoryCountType =
  Exclude<Parameters<typeof SpaceGlue.GetMemberCountHistory.createRequest>[0]['query']['countType'], undefined>;

export type SpaceCountHistoryGroupBy =
  Exclude<Parameters<typeof SpaceGlue.GetMemberCountHistory.createRequest>[0]['query']['groupBy'], undefined>;

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
}
