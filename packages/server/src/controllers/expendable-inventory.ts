import { singleton, injectableConstructor } from '@innolens/resolver/node';
import csvParse from 'csv-parse';
import createHttpError, { BadRequest } from 'http-errors';
import { CREATED, BAD_REQUEST, NOT_FOUND } from 'http-status-codes';

import {
  ExpendableInventoryService, ExpendableInventoryTypeNotFoundError,
  ExpendableInventoryType, ExpendableInventoryImportAccessRecord
} from '../services/expendable-inventory';
import { FileService } from '../services/file';
import { OAuth2Service } from '../services/oauth2';
import {
  decodeCsvRecord, decodeCsvString, decodeCsvInteger,
  decodeCsvDate
} from '../utils/csv-parser';

import { ExpendableInventoryControllerGlue } from './glues/expendable-inventory';
import { FileController } from './utils/file-controller';


@injectableConstructor({
  expendableInventoryService: ExpendableInventoryService,
  oauth2Service: OAuth2Service,
  fileService: FileService
})
@singleton()
// eslint-disable-next-line max-len
export class ExpendableInventoryController extends FileController(ExpendableInventoryControllerGlue) {
  private readonly _expendableInventoryService: ExpendableInventoryService;
  private readonly _oauth2Service: OAuth2Service;

  protected readonly [FileController.fileService]: FileService;


  public constructor(deps: {
    expendableInventoryService: ExpendableInventoryService;
    oauth2Service: OAuth2Service;
    fileService: FileService;
  }) {
    super();
    ({
      expendableInventoryService: this._expendableInventoryService,
      oauth2Service: this._oauth2Service,
      fileService: this[FileController.fileService]
    } = deps);
  }

  protected async checkBearerToken(bearToken: string): Promise<boolean> {
    return this._oauth2Service.checkAccessToken(bearToken);
  }


  // eslint-disable-next-line max-len
  protected async handleGetTypes(ctx: ExpendableInventoryControllerGlue.GetTypesContext): Promise<void> {
    const spaces = await this._expendableInventoryService.getTypes();
    ctx.responseBodyData = spaces.map((type) => ({
      typeId: type.typeId,
      typeName: type.typeName
    }));
  }

  protected async handleImportTypes(
    ctx: ExpendableInventoryControllerGlue.ImportTypesContext
  ): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);

    const records: Array<Pick<ExpendableInventoryType, 'typeId' | 'typeName'>> = [];
    const csvRecordStream = fileStream.pipe(csvParse({ columns: true }));
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

    await this._expendableInventoryService.importTypes(records);
    ctx.status = CREATED;
  }


  protected async handleImportAccessRecords(
    ctx: ExpendableInventoryControllerGlue.ImportAccessRecordsContext
  ): Promise<void> {
    const accessRecordsStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);

    const csvRecordStream = accessRecordsStream.pipe(csvParse({ columns: true }));
    const records: Array<ExpendableInventoryImportAccessRecord> = [];
    for await (const csvRecord of csvRecordStream) {
      const record = decodeCsvRecord(
        csvRecord,
        ['action', 'time', 'member_id', 'quantity', 'take_quantity'],
        {
          action: decodeCsvString,
          time: decodeCsvDate,
          member_id: decodeCsvString,
          quantity: (item) => decodeCsvInteger(item) ?? -1,
          take_quantity: (item) => decodeCsvInteger(item) ?? -1
        }
      );
      if (record === undefined) {
        throw new BadRequest('Failed to parse a row in the access records csv file');
      }
      switch (record.action) {
        case 'set': {
          if (record.quantity < 0) {
            throw new BadRequest(`record with action "set" should has a positive or zero quantity, got ${record.quantity}`);
          }
          records.push({
            action: 'set',
            time: record.time,
            quantity: record.quantity
          });
          break;
        }
        case 'take': {
          if (record.take_quantity < 0) {
            throw new BadRequest(`record with action "set" should has a positive or zero take_quantity, got ${record.take_quantity}`);
          }
          records.push({
            action: 'take',
            time: record.time,
            memberId: record.member_id,
            takeQuantity: record.take_quantity
          });
          break;
        }
        default: {
          throw new BadRequest(`Csv file contains a row with unsupported action: ${record.action}`);
        }
      }
    }

    try {
      await this._expendableInventoryService.importAccessRecords(
        ctx.params.typeId,
        ctx.requestBody.deleteFromTime,
        records
      );
    } catch (err) {
      if (err instanceof ExpendableInventoryTypeNotFoundError) {
        throw createHttpError(NOT_FOUND, err);
      }
      throw err;
    }

    ctx.status = CREATED;
  }


  protected async handleGetQuantityHistory(
    ctx: ExpendableInventoryControllerGlue.GetQuantityHistoryContext
  ): Promise<void> {
    try {
      ctx.responseBodyData = await this._expendableInventoryService.getQuantityHistory({
        fromTime: ctx.requestBody.fromTime,
        toTime: ctx.requestBody.toTime,
        timeStepMs: ctx.requestBody.timeStepMs,
        filterTypeIds: ctx.requestBody.filterTypeIds ?? null,
        groupBy: ctx.requestBody.groupBy ?? null,
        countType: ctx.requestBody.countType ?? 'quantity'
      });
    } catch (err) {
      if (err instanceof ExpendableInventoryTypeNotFoundError) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }
  }

  protected async handleGetQuantityForecast(
    ctx: ExpendableInventoryControllerGlue.GetQuantityForecastContext
  ): Promise<void> {
    try {
      ctx.responseBodyData = await this._expendableInventoryService.getQuantityForecast({
        fromTime: ctx.requestBody.fromTime,
        timeStepMs: ctx.requestBody.timeStepMs,
        filterTypeIds: ctx.requestBody.filterTypeIds ?? null,
        groupBy: ctx.requestBody.groupBy ?? null,
        countType: ctx.requestBody.countType ?? 'quantity'
      });
    } catch (err) {
      if (err instanceof ExpendableInventoryTypeNotFoundError) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }
  }

}
