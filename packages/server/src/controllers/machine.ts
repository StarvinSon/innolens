import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { parseISO } from 'date-fns';
import createHttpError from 'http-errors';
import { CREATED, BAD_REQUEST, NOT_FOUND } from 'http-status-codes';

import { MachineInstance } from '../db/machine-instance';
import { FileService } from '../services/file';
import {
  MachineService, MachineTypeNotFoundError,
  MachineMemberCountHistory, MachineInstanceNotFoundError
} from '../services/machine';
import { OAuth2Service } from '../services/oauth2';
import { fromAsync } from '../utils/array';

import { MachineControllerGlue } from './glues/machine';
import { CsvParser } from './utils/csv-parser';
import { FileController } from './utils/file-controller';


export interface CsvTypeRecord {
  readonly type_id: string;
  readonly type_name: string;
}

export type CsvTypeRecordJson = CsvTypeRecord;

export const csvTypeRecordJsonSchema: object = {
  type: 'object',
  required: ['type_id', 'type_name'],
  additionalProperties: false,
  properties: {
    type_id: {
      type: 'string'
    },
    type_name: {
      type: 'string'
    }
  }
};


export interface CsvInstanceRecord {
  readonly instance_id: string;
  readonly instance_name: string;
}

export type CsvInstanceRecordJson = CsvInstanceRecord;

export const csvInstanceRecordJsonSchema: object = {
  type: 'object',
  required: ['instance_id', 'instance_name'],
  additionalProperties: false,
  properties: {
    instance_id: {
      type: 'string'
    },
    instance_name: {
      type: 'string'
    }
  }
};

interface CsvAccessRecord {
  readonly time: Date;
  readonly member_id: string;
  readonly action: 'acquire' | 'release';
}

interface CsvAccessRecordJson extends Omit<CsvAccessRecord, 'time'> {
  readonly time: string;
}

const csvAccessRecordJsonSchema: object = {
  type: 'object',
  required: ['time', 'member_id', 'action'],
  additionalProperties: false,
  properties: {
    time: {
      type: 'string'
    },
    member_id: {
      type: 'string'
    },
    action: {
      enum: ['acquire', 'release']
    }
  }
};


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

  /* eslint-disable max-len */
  private readonly _typeCsvParser = new CsvParser<CsvTypeRecordJson>(csvTypeRecordJsonSchema);
  private readonly _instanceCsvParser = new CsvParser<CsvInstanceRecordJson>(csvInstanceRecordJsonSchema);
  private readonly _instanceAccessRecordsCsvParser = new CsvParser<CsvAccessRecordJson>(csvAccessRecordJsonSchema);
  /* eslint-enable max-len */


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


  protected async handleGetTypes(ctx: MachineControllerGlue.GetTypesContext): Promise<void> {
    const spaces = await this._machineService.getTypes();
    ctx.responseBodyData = spaces.map((type) => ({
      typeId: type.typeId,
      typeName: type.typeName
    }));
  }

  protected async handlePostTypes(ctx: MachineControllerGlue.PostTypesContext): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);
    const records = (await fromAsync(this._typeCsvParser.parse(fileStream)))
      .map((record) => ({
        typeId: record.type_id,
        typeName: record.type_name
      }));

    await this._machineService.importTypes(records);
    ctx.status = CREATED;
  }


  // eslint-disable-next-line max-len
  protected async handleGetInstances(ctx: MachineControllerGlue.GetInstancesContext): Promise<void> {
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

  // eslint-disable-next-line max-len
  protected async handlePostInstances(ctx: MachineControllerGlue.PostInstancesContext): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);
    const records = (await fromAsync(this._instanceCsvParser.parse(fileStream)))
      .map((record) => ({
        instanceId: record.instance_id,
        instanceName: record.instance_name
      }));

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

  // eslint-disable-next-line max-len
  protected async handlePostInstanceAccessRecords(ctx: MachineControllerGlue.PostInstanceAccessRecordsContext): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);
    const records = (await fromAsync(this._instanceAccessRecordsCsvParser.parse(fileStream)))
      .map((record) => ({
        time: parseISO(record.time),
        memberId: record.member_id,
        action: record.action
      }));

    try {
      await this._machineService.importAccessRecords(
        ctx.params.typeId,
        ctx.params.instanceId,
        ctx.requestBody.deleteFromTime,
        ctx.requestBody.deleteToTime,
        records
      );
    } catch (err) {
      if (err instanceof MachineTypeNotFoundError || err instanceof MachineInstanceNotFoundError) {
        throw createHttpError(NOT_FOUND, err);
      }
      throw err;
    }

    ctx.status = CREATED;
  }


  // eslint-disable-next-line max-len
  protected async handleGetMemberCountHistory(ctx: MachineControllerGlue.GetMemberCountHistoryContext): Promise<void> {
    let history: MachineMemberCountHistory;
    try {
      history = await this._machineService.getMemberCountHistory(
        ctx.query.typeIds ?? null,
        ctx.query.instanceIds ?? null,
        ctx.query.groupBy ?? 'all',
        ctx.query.pastHours
      );
    } catch (err) {
      if (err instanceof MachineTypeNotFoundError || err instanceof MachineInstanceNotFoundError) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }

    ctx.responseBodyData = history;
  }
}
