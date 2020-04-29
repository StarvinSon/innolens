import { singleton, injectableConstructor } from '@innolens/resolver/node';
import csvParse from 'csv-parse';
import createHttpError, { BadRequest } from 'http-errors';
import { CREATED, BAD_REQUEST } from 'http-status-codes';

import { FileService } from '../services/file';
import { OAuth2Service } from '../services/oauth2';
import {
  SpaceService, SpaceNotFoundError, Space,
  SpaceImportAccessRecord, SpaceMemberCountHistory, SpaceMemberCountForecast
} from '../services/space';
import {
  decodeCsvString, decodeCsvRecord, decodeCsvDate, decodeCsvInteger
} from '../utils/csv-parser';

import { SpaceControllerGlue } from './glues/space';
import { FileController } from './utils/file-controller';


@injectableConstructor({
  spaceService: SpaceService,
  oauth2Service: OAuth2Service,
  fileService: FileService
})
@singleton()
export class SpaceController extends FileController(SpaceControllerGlue) {
  private readonly _spaceService: SpaceService;
  private readonly _oauth2Service: OAuth2Service;

  protected readonly [FileController.fileService]: FileService;


  public constructor(deps: {
    spaceService: SpaceService;
    oauth2Service: OAuth2Service;
    fileService: FileService;
  }) {
    super();
    ({
      spaceService: this._spaceService,
      oauth2Service: this._oauth2Service,
      fileService: this[FileController.fileService]
    } = deps);
  }

  protected async checkBearerToken(token: string): Promise<boolean> {
    return this._oauth2Service.checkAccessToken(token);
  }


  protected async handleGetSpaces(ctx: SpaceControllerGlue.GetSpacesContext): Promise<void> {
    const spaces = await this._spaceService.getSpaces();
    ctx.responseBodyData = spaces.map((space) => ({
      spaceId: space.spaceId,
      spaceName: space.spaceName,
      spaceCapacity: space.spaceCapacity
    }));
  }

  protected async handleImportSpaces(ctx: SpaceControllerGlue.ImportSpacesContext): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);

    const csvRecordStream = fileStream.pipe(csvParse({ columns: true }));
    const records: Array<Pick<Space, 'spaceId' | 'spaceName' | 'spaceCapacity'>> = [];
    for await (const csvRecord of csvRecordStream) {
      const record = decodeCsvRecord(
        csvRecord,
        ['space_id', 'space_name', 'space_capacity'],
        {
          space_id: decodeCsvString,
          space_name: decodeCsvString,
          space_capacity: decodeCsvInteger
        }
      );
      if (record === undefined) {
        throw new BadRequest('Failed to parse a row in the space csv file');
      }
      records.push({
        spaceId: record.space_id,
        spaceName: record.space_name,
        spaceCapacity: record.space_capacity
      });
    }

    await this._spaceService.importSpaces(records);
    ctx.status = CREATED;
  }

  protected async handleImportAccessRecords(
    ctx: SpaceControllerGlue.ImportAccessRecordsContext
  ): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);

    const csvRecordStream = fileStream.pipe(csvParse({ columns: true }));
    const records: Array<SpaceImportAccessRecord> = [];
    for await (const csvRecord of csvRecordStream) {
      const record = decodeCsvRecord(
        csvRecord,
        ['time', 'member_id', 'action'],
        {
          time: decodeCsvDate,
          member_id: decodeCsvString,
          action: (item) => item === 'enter' || item === 'exit' ? item : undefined
        }
      );
      if (record === undefined) {
        throw new BadRequest('Failed to parse a row in the space csv file');
      }
      records.push({
        time: record.time,
        memberId: record.member_id,
        action: record.action
      });
    }

    try {
      await this._spaceService.importAccessRecords(
        ctx.params.spaceId,
        ctx.requestBody.deleteFromTime,
        records
      );
    } catch (err) {
      if (err instanceof SpaceNotFoundError) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }
    ctx.status = CREATED;
  }


  protected async handleGetMemberCountHistory(
    ctx: SpaceControllerGlue.GetMemberCountHistoryContext
  ): Promise<void> {
    let history: SpaceMemberCountHistory;
    try {
      history = await this._spaceService.getMemberCountHistory({
        fromTime: ctx.requestBody.fromTime,
        toTime: ctx.requestBody.toTime,
        timeStepMs: ctx.requestBody.timeStepMs ?? (30 * 60 * 1000),
        filterSpaceIds: ctx.requestBody.filterSpaceIds ?? null,
        countType: ctx.requestBody.countType ?? 'stay',
        groupBy: ctx.requestBody.groupBy ?? null
      });
    } catch (err) {
      if (err instanceof SpaceNotFoundError) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }
    ctx.responseBodyData = history;
  }


  protected async handleGetMemberCountForecast(
    ctx: SpaceControllerGlue.GetMemberCountForecastContext
  ): Promise<void> {
    let forecast: SpaceMemberCountForecast;
    try {
      forecast = await this._spaceService.getMemberCountForecast({
        fromTime: ctx.requestBody.fromTime,
        filterSpaceIds: ctx.requestBody.filterSpaceIds ?? null,
        groupBy: ctx.requestBody.groupBy ?? null,
        countType: ctx.requestBody.countType ?? 'stay'
      });
    } catch (err) {
      if (err instanceof SpaceNotFoundError) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }
    ctx.responseBodyData = forecast;
  }

  protected async handleGetCorrelation(
    ctx: SpaceControllerGlue.GetCorrelationContext
  ): Promise<void> {
    try {
      ctx.responseBodyData = await this._spaceService.getCorrelation({
        fromTime: ctx.requestBody.fromTime,
        timeStepMs: ctx.requestBody.timeStepMs ?? (2 * 60 * 60 * 1000),
        filterSpaceIds: ctx.requestBody.filterSpaceIds,
        countType: ctx.requestBody.countType ?? 'uniqueStay'
      });
    } catch (err) {
      if (err instanceof SpaceNotFoundError) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }
  }
}
