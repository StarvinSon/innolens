import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { parseISO } from 'date-fns';
import createHttpError from 'http-errors';
import { CREATED, BAD_REQUEST, NOT_FOUND } from 'http-status-codes';

import { FileService } from '../services/file';
import { OAuth2Service } from '../services/oauth2';
import {
  ReusableInventoryService, ReusableInventoryTypeNotFoundError, ReusableInventoryInstance,
  ReusableInventoryMemberCountHistory, ReusableInventoryInstanceNotFoundError
} from '../services/reusable-inventory';
import { fromAsync } from '../utils/array';

import { ReusableInventoryControllerGlue } from './glues/reusable-inventory';
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
  reusableInventoryService: ReusableInventoryService,
  oauth2Service: OAuth2Service,
  fileService: FileService
})
@singleton()
export class ReusableInventoryController extends FileController(ReusableInventoryControllerGlue) {
  private readonly _reusableInventoryService: ReusableInventoryService;
  private readonly _oauth2Service: OAuth2Service;

  protected readonly [FileController.fileService]: FileService;

  /* eslint-disable max-len */
  private readonly _typeCsvParser = new CsvParser<CsvTypeRecordJson>(csvTypeRecordJsonSchema);
  private readonly _instanceCsvParser = new CsvParser<CsvInstanceRecordJson>(csvInstanceRecordJsonSchema);
  private readonly _instanceAccessRecordsCsvParser = new CsvParser<CsvAccessRecordJson>(csvAccessRecordJsonSchema);
  /* eslint-enable max-len */


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


  // eslint-disable-next-line max-len
  protected async handleGetTypes(ctx: ReusableInventoryControllerGlue.GetTypesContext): Promise<void> {
    const spaces = await this._reusableInventoryService.getTypes();
    ctx.responseBodyData = spaces.map((type) => ({
      typeId: type.typeId,
      typeName: type.typeName
    }));
  }

  // eslint-disable-next-line max-len
  protected async handlePostTypes(ctx: ReusableInventoryControllerGlue.PostTypesContext): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);
    const records = (await fromAsync(this._typeCsvParser.parse(fileStream)))
      .map((record) => ({
        typeId: record.type_id,
        typeName: record.type_name
      }));

    await this._reusableInventoryService.importTypes(records);
    ctx.status = CREATED;
  }


  // eslint-disable-next-line max-len
  protected async handleGetInstances(ctx: ReusableInventoryControllerGlue.GetInstancesContext): Promise<void> {
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

  // eslint-disable-next-line max-len
  protected async handlePostInstances(ctx: ReusableInventoryControllerGlue.PostInstancesContext): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);
    const records = (await fromAsync(this._instanceCsvParser.parse(fileStream)))
      .map((record) => ({
        instanceId: record.instance_id,
        instanceName: record.instance_name
      }));

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

  // eslint-disable-next-line max-len
  protected async handlePostInstanceAccessRecords(ctx: ReusableInventoryControllerGlue.PostInstanceAccessRecordsContext): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);
    const records = (await fromAsync(this._instanceAccessRecordsCsvParser.parse(fileStream)))
      .map((record) => ({
        time: parseISO(record.time),
        memberId: record.member_id,
        action: record.action
      }));

    try {
      await this._reusableInventoryService.importAccessRecords(
        ctx.params.typeId,
        ctx.params.instanceId,
        ctx.requestBody.deleteFromTime,
        ctx.requestBody.deleteToTime,
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


  // eslint-disable-next-line max-len
  protected async handleGetMemberCountHistory(ctx: ReusableInventoryControllerGlue.GetMemberCountHistoryContext): Promise<void> {
    let history: ReusableInventoryMemberCountHistory;
    try {
      history = await this._reusableInventoryService.getMemberCountHistory(
        ctx.query.pastHours,
        ctx.query.typeIds ?? null,
        ctx.query.instanceIds ?? null,
        ctx.query.groupBy ?? null,
        ctx.query.countType ?? 'useCounts'
      );
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
