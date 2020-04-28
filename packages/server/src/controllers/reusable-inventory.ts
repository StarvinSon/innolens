import { singleton, injectableConstructor } from '@innolens/resolver/node';
import csvParse from 'csv-parse';
import createHttpError, { BadRequest } from 'http-errors';
import { CREATED, BAD_REQUEST, NOT_FOUND } from 'http-status-codes';

import { FileService } from '../services/file';
import { OAuth2Service } from '../services/oauth2';
import {
  ReusableInventoryService, ReusableInventoryTypeNotFoundError, ReusableInventoryInstance,
  ReusableInventoryMemberCountHistory, ReusableInventoryInstanceNotFoundError,
  ReusableInventoryType, ReusableInventoryImportInstanceAccessRecord,
  ReusableInventoryMemberCountForecast
} from '../services/reusable-inventory';
import { decodeCsvRecord, decodeCsvString, decodeCsvDate } from '../utils/csv-parser';

import { ReusableInventoryControllerGlue } from './glues/reusable-inventory';
import { FileController } from './utils/file-controller';


@injectableConstructor({
  reusableInventoryService: ReusableInventoryService,
  oauth2Service: OAuth2Service,
  fileService: FileService
})
@singleton()
export class ReusableInventoryController extends FileController(ReusableInventoryControllerGlue) {
  private readonly _reusableInventoryService: ReusableInventoryService;
  private readonly _oauth2Service: OAuth2Service;

  protected readonly [FileController.fileService]: FileService;


  public constructor(deps: {
    reusableInventoryService: ReusableInventoryService;
    oauth2Service: OAuth2Service;
    fileService: FileService;
  }) {
    super();
    ({
      reusableInventoryService: this._reusableInventoryService,
      oauth2Service: this._oauth2Service,
      fileService: this[FileController.fileService]
    } = deps);
  }

  protected async checkBearerToken(bearToken: string): Promise<boolean> {
    return this._oauth2Service.checkAccessToken(bearToken);
  }


  protected async handleGetTypes(
    ctx: ReusableInventoryControllerGlue.GetTypesContext
  ): Promise<void> {
    const spaces = await this._reusableInventoryService.getTypes();
    ctx.responseBodyData = spaces.map((type) => ({
      typeId: type.typeId,
      typeName: type.typeName
    }));
  }

  protected async handleImportTypes(
    ctx: ReusableInventoryControllerGlue.ImportTypesContext
  ): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);

    const csvRecordStream = fileStream.pipe(csvParse({ columns: true }));
    const records: Array<Pick<ReusableInventoryType, 'typeId' | 'typeName'>> = [];
    for await (const csvRecord of csvRecordStream) {
      const record = decodeCsvRecord(
        csvRecord,
        ['type_id', 'type_name'],
        {
          type_id: decodeCsvString,
          type_name: decodeCsvString
        }
      );
      if (record === undefined) {
        throw new BadRequest('Failed to parse a row in the reusable inventory type csv file');
      }
      records.push({
        typeId: record.type_id,
        typeName: record.type_name
      });
    }

    await this._reusableInventoryService.importTypes(records);
    ctx.status = CREATED;
  }


  protected async handleGetInstances(
    ctx: ReusableInventoryControllerGlue.GetInstancesContext
  ): Promise<void> {
    let instances: ReadonlyArray<ReusableInventoryInstance>;
    try {
      instances = await this._reusableInventoryService.getInstances(ctx.params.typeId);
    } catch (err) {
      if (err instanceof ReusableInventoryTypeNotFoundError) {
        throw createHttpError(NOT_FOUND, err);
      }
      throw err;
    }

    ctx.responseBodyData = instances.map((instance) => ({
      instanceId: instance.instanceId,
      instanceName: instance.instanceName
    }));
  }

  protected async handleImportInstances(
    ctx: ReusableInventoryControllerGlue.ImportInstancesContext
  ): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);

    const records: Array<Pick<ReusableInventoryInstance, 'instanceId' | 'instanceName'>> = [];
    const csvRecordStream = fileStream.pipe(csvParse({ columns: true }));
    for await (const csvRecord of csvRecordStream) {
      const record = decodeCsvRecord(
        csvRecord,
        ['instance_id', 'instance_name'],
        {
          instance_id: decodeCsvString,
          instance_name: decodeCsvString
        }
      );
      if (record === undefined) {
        throw new BadRequest('Failed to parse a row in the reusable inventory type csv file');
      }
      records.push({
        instanceId: record.instance_id,
        instanceName: record.instance_name
      });
    }

    try {
      await this._reusableInventoryService.importInstances(ctx.params.typeId, records);
    } catch (err) {
      if (err instanceof ReusableInventoryTypeNotFoundError) {
        throw createHttpError(NOT_FOUND, err);
      }
      throw err;
    }

    ctx.status = CREATED;
  }

  protected async handleImportInstanceAccessRecords(
    ctx: ReusableInventoryControllerGlue.ImportInstanceAccessRecordsContext
  ): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);

    const records: Array<ReusableInventoryImportInstanceAccessRecord> = [];
    const csvRecordStream = fileStream.pipe(csvParse({ columns: true }));
    for await (const csvRecord of csvRecordStream) {
      const record = decodeCsvRecord(
        csvRecord,
        ['time', 'action', 'member_id'],
        {
          time: decodeCsvDate,
          action: (item) => item === 'acquire' || item === 'release' ? item : undefined,
          member_id: decodeCsvString
        }
      );
      if (record === undefined) {
        throw new BadRequest('Failed to parse a row in the reusable inventory type csv file');
      }
      records.push({
        time: record.time,
        action: record.action,
        memberId: record.member_id
      });
    }

    try {
      await this._reusableInventoryService.importInstanceAccessRecords(
        ctx.params.typeId,
        ctx.params.instanceId,
        ctx.requestBody.deleteFromTime,
        records
      );
    } catch (err) {
      if (
        err instanceof ReusableInventoryTypeNotFoundError
        || err instanceof ReusableInventoryInstanceNotFoundError
      ) {
        throw createHttpError(NOT_FOUND, err);
      }
      throw err;
    }

    ctx.status = CREATED;
  }


  protected async handleGetMemberCountHistory(
    ctx: ReusableInventoryControllerGlue.GetMemberCountHistoryContext
  ): Promise<void> {
    let history: ReusableInventoryMemberCountHistory;
    try {
      history = await this._reusableInventoryService.getMemberCountHistory({
        fromTime: ctx.requestBody.fromTime,
        toTime: ctx.requestBody.toTime,
        timeStepMs: ctx.requestBody.timeStepMs ?? (30 * 60 * 1000),
        filterTypeIds: ctx.requestBody.filterTypeIds ?? null,
        filterInstanceIds: ctx.requestBody.filterInstanceIds ?? null,
        groupBy: ctx.requestBody.groupBy ?? null,
        countType: ctx.requestBody.countType ?? 'use'
      });
    } catch (err) {
      if (
        err instanceof ReusableInventoryTypeNotFoundError
        || err instanceof ReusableInventoryInstanceNotFoundError
      ) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }

    ctx.responseBodyData = history;
  }

  protected async handleGetMemberCountForecast(
    ctx: ReusableInventoryControllerGlue.GetMemberCountForecastContext
  ): Promise<void> {
    let history: ReusableInventoryMemberCountForecast;
    try {
      history = await this._reusableInventoryService.getMemberCountForecast({
        fromTime: ctx.requestBody.fromTime,
        filterTypeIds: ctx.requestBody.filterTypeIds ?? null,
        filterInstanceIds: ctx.requestBody.filterInstanceIds ?? null,
        groupBy: ctx.requestBody.groupBy ?? null,
        countType: ctx.requestBody.countType ?? 'use'
      });
    } catch (err) {
      if (
        err instanceof ReusableInventoryTypeNotFoundError
        || err instanceof ReusableInventoryInstanceNotFoundError
      ) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }

    ctx.responseBodyData = history;
  }
}
