import { singleton, injectableConstructor } from '@innolens/resolver/node';
import csvParse from 'csv-parse';
import createHttpError, { BadRequest, NotImplemented } from 'http-errors';
import { CREATED, BAD_REQUEST } from 'http-status-codes';

import { FileService } from '../services/file';
import { OAuth2Service } from '../services/oauth2';
import {
  SpaceService, SpaceNotFoundError,
  Space, SpaceAccessRecord
} from '../services/space';
import { decodeCsvString, decodeCsvRecord, decodeCsvDate } from '../utils/csv-parser';

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


  protected async handlePostSpaces(ctx: SpaceControllerGlue.PostSpacesContext): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);

    const records: Array<Pick<Space, 'spaceId' | 'spaceName'>> = [];
    for await (const csvRecord of fileStream.pipe(csvParse({ columns: true }))) {
      const record = decodeCsvRecord(
        csvRecord,
        ['space_id', 'space_name'],
        {
          space_id: decodeCsvString,
          space_name: decodeCsvString
        }
      );
      if (record === undefined) {
        throw new BadRequest('Failed to parse a row in the space csv file');
      }
      records.push({
        spaceId: record.space_id,
        spaceName: record.space_name
      });
    }

    await this._spaceService.importSpaces(records);
    ctx.status = CREATED;
  }

  protected async handleGetSpaces(ctx: SpaceControllerGlue.GetSpacesContext): Promise<void> {
    const spaces = await this._spaceService.getSpaces();
    ctx.responseBodyData = spaces.map((space) => ({
      spaceId: space.spaceId,
      spaceName: space.spaceName
    }));
  }


  protected async handlePostAccessRecords(
    ctx: SpaceControllerGlue.PostAccessRecordsContext
  ): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);

    const records: Array<Pick<SpaceAccessRecord, 'memberId' | 'time' | 'action'>> = [];
    for await (const csvRecord of fileStream.pipe(csvParse({ columns: true }))) {
      const record = decodeCsvRecord(
        csvRecord,
        ['time', 'member_id', 'action'],
        {
          time: decodeCsvDate,
          member_id: decodeCsvString,
          action: (item) => {
            if (item === 'enter' || item === 'exit') return item;
            return undefined;
          }
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


  protected async handleGetMemberCount(
    ctx: SpaceControllerGlue.GetMemberCountContext
  ): Promise<void> {
    ctx.responseBodyData = await this._spaceService.getMemberCount(
      ctx.query.time ?? new Date(),
      ctx.query.spaceIds ?? null,
      ctx.query.countType ?? 'total',
      ctx.query.groupBy ?? null
    );
  }

  protected async handleGetMemberCountHistory(
    ctx: SpaceControllerGlue.GetMemberCountHistoryContext
  ): Promise<void> {
    try {
      ctx.responseBodyData = await this._spaceService.getMemberCountHistory({
        fromTime: ctx.query.fromTime,
        toTime: ctx.query.toTime,
        timeStepMs: ctx.query.timeStepMs ?? (30 * 60 * 1000),
        filter: {
          spaceIds: ctx.query.filterSpaceIds ?? null,
          memberIds: ctx.query.filterMemberIds ?? null
        },
        countType: ctx.query.countType ?? 'stay',
        groupBy: ctx.query.groupBy ?? null
      });
    } catch (err) {
      if (err instanceof SpaceNotFoundError) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }
  }


  protected async handleGetMemberCountForecast(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ctx: SpaceControllerGlue.GetMemberCountForecastContext
  ): Promise<void> {
    throw new NotImplemented('Forecast is not implemented');
  }
}
