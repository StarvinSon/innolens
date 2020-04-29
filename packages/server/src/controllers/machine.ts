import { singleton, injectableConstructor } from '@innolens/resolver/node';
import csvParse from 'csv-parse';
import createHttpError, { BadRequest } from 'http-errors';
import { CREATED, BAD_REQUEST, NOT_FOUND } from 'http-status-codes';

import { FileService } from '../services/file';
import {
  MachineService, MachineTypeNotFoundError, MachineType, MachineInstance,
  MachineMemberCountHistory, MachineInstanceNotFoundError,
  MachineImportInstanceAccessRecord, MachineMemberCountForecast
} from '../services/machine';
import { OAuth2Service } from '../services/oauth2';
import { decodeCsvRecord, decodeCsvString, decodeCsvDate } from '../utils/csv-parser';

import { MachineControllerGlue } from './glues/machine';
import { FileController } from './utils/file-controller';


@injectableConstructor({
  machineService: MachineService,
  oauth2Service: OAuth2Service,
  fileService: FileService
})
@singleton()
export class MachineController extends FileController(MachineControllerGlue) {
  private readonly _machineService: MachineService;
  private readonly _oauth2Service: OAuth2Service;

  protected readonly [FileController.fileService]: FileService;


  public constructor(deps: {
    machineService: MachineService;
    oauth2Service: OAuth2Service;
    fileService: FileService;
  }) {
    super();
    ({
      machineService: this._machineService,
      oauth2Service: this._oauth2Service,
      fileService: this[FileController.fileService]
    } = deps);
  }


  protected async checkBearerToken(bearToken: string): Promise<boolean> {
    return this._oauth2Service.checkAccessToken(bearToken);
  }


  protected async handleGetTypes(
    ctx: MachineControllerGlue.GetTypesContext
  ): Promise<void> {
    const spaces = await this._machineService.getTypes();
    ctx.responseBodyData = spaces.map((type) => ({
      typeId: type.typeId,
      typeName: type.typeName
    }));
  }

  protected async handleImportTypes(
    ctx: MachineControllerGlue.ImportTypesContext
  ): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);

    const csvRecordStream = fileStream.pipe(csvParse({ columns: true }));
    const records: Array<Pick<MachineType, 'typeId' | 'typeName'>> = [];
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

    await this._machineService.importTypes(records);
    ctx.status = CREATED;
  }


  protected async handleGetInstances(
    ctx: MachineControllerGlue.GetInstancesContext
  ): Promise<void> {
    let instances: ReadonlyArray<MachineInstance>;
    try {
      instances = await this._machineService.getInstances(ctx.params.typeId);
    } catch (err) {
      if (err instanceof MachineTypeNotFoundError) {
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
    ctx: MachineControllerGlue.ImportInstancesContext
  ): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);

    const records: Array<Pick<MachineInstance, 'instanceId' | 'instanceName'>> = [];
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
      await this._machineService.importInstances(ctx.params.typeId, records);
    } catch (err) {
      if (err instanceof MachineTypeNotFoundError) {
        throw createHttpError(NOT_FOUND, err);
      }
      throw err;
    }

    ctx.status = CREATED;
  }

  protected async handleImportInstanceAccessRecords(
    ctx: MachineControllerGlue.ImportInstanceAccessRecordsContext
  ): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);

    const records: Array<MachineImportInstanceAccessRecord> = [];
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
      await this._machineService.importInstanceAccessRecords(
        ctx.params.typeId,
        ctx.params.instanceId,
        ctx.requestBody.deleteFromTime,
        records
      );
    } catch (err) {
      if (
        err instanceof MachineTypeNotFoundError
        || err instanceof MachineInstanceNotFoundError
      ) {
        throw createHttpError(NOT_FOUND, err);
      }
      throw err;
    }

    ctx.status = CREATED;
  }


  protected async handleGetMemberCountHistory(
    ctx: MachineControllerGlue.GetMemberCountHistoryContext
  ): Promise<void> {
    let history: MachineMemberCountHistory;
    try {
      history = await this._machineService.getMemberCountHistory({
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
        err instanceof MachineTypeNotFoundError
        || err instanceof MachineInstanceNotFoundError
      ) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }

    ctx.responseBodyData = history;
  }

  protected async handleGetMemberCountForecast(
    ctx: MachineControllerGlue.GetMemberCountForecastContext
  ): Promise<void> {
    let forecast: MachineMemberCountForecast;
    try {
      forecast = await this._machineService.getMemberCountForecast({
        fromTime: ctx.requestBody.fromTime,
        filterTypeIds: ctx.requestBody.filterTypeIds ?? null,
        filterInstanceIds: ctx.requestBody.filterInstanceIds ?? null,
        groupBy: ctx.requestBody.groupBy ?? null,
        countType: ctx.requestBody.countType ?? 'use'
      });
    } catch (err) {
      if (
        err instanceof MachineTypeNotFoundError
        || err instanceof MachineInstanceNotFoundError
      ) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }

    ctx.responseBodyData = forecast;
  }
}
