import { singleton, injectableConstructor } from '@innolens/resolver/node';
import csvParse from 'csv-parse';
import { startOfHour, subHours } from 'date-fns';
import createHttpError, { BadRequest } from 'http-errors';
import { CREATED, BAD_REQUEST, NOT_FOUND } from 'http-status-codes';

import {
  ExpendableInventoryService, ExpendableInventoryTypeNotFoundError,
  ExpendableInventoryQuantityRecord, ExpendableInventoryAccessRecord,
  ExpendableInventoryAggregatedQuantityHistory, ExpendableInventoryAggregatedAccessHistory,
  ExpendableInventoryType
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

  // eslint-disable-next-line max-len
  protected async handlePostTypes(ctx: ExpendableInventoryControllerGlue.PostTypesContext): Promise<void> {
    const fileStream = this.getFile(ctx.authentication.token, ctx.requestBody.fileId);

    const records: Array<Omit<ExpendableInventoryType, '_id'>> = [];
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


  // eslint-disable-next-line max-len
  protected async handlePostQuantitySetAndAccessRecords(ctx: ExpendableInventoryControllerGlue.PostQuantitySetAndAccessRecordsContext): Promise<void> {
    const quantitySetRecordsStream =
      this.getFile(ctx.authentication.token, ctx.requestBody.quantitySetRecordsFileId);
    const accessRecordsStream =
      this.getFile(ctx.authentication.token, ctx.requestBody.accessRecordsFileId);

    const [quantitySetRecords, accessRecords] = await Promise.all([
      Promise.resolve().then(async () => {
        const csvRecordStream = quantitySetRecordsStream.pipe(csvParse({ columns: true }));
        const records: Array<Omit<ExpendableInventoryQuantityRecord, '_id' | 'typeId' | 'mode'>> = [];
        for await (const csvRecord of csvRecordStream) {
          const record = decodeCsvRecord(
            csvRecord,
            ['time', 'quantity'],
            {
              time: decodeCsvDate,
              quantity: decodeCsvInteger
            }
          );
          if (record === undefined) {
            throw new BadRequest('Failed to parse a row in the quantity set records csv file');
          }
          records.push(record);
        }
        return records;
      }),
      Promise.resolve().then(async () => {
        const csvRecordStream = accessRecordsStream.pipe(csvParse({ columns: true }));
        const records: Array<Omit<ExpendableInventoryAccessRecord, '_id' | 'typeId'>> = [];
        for await (const csvRecord of csvRecordStream) {
          const record = decodeCsvRecord(
            csvRecord,
            ['time', 'member_id', 'quantity'],
            {
              time: decodeCsvDate,
              member_id: decodeCsvString,
              quantity: decodeCsvInteger
            }
          );
          if (record === undefined) {
            throw new BadRequest('Failed to parse a row in the access records csv file');
          }
          records.push({
            time: record.time,
            memberId: record.member_id,
            quantity: record.quantity
          });
        }
        return records;
      })
    ] as const);

    try {
      await this._expendableInventoryService.importQuantitySetAndAccessRecords(
        ctx.params.typeId,
        ctx.requestBody.deleteFromTime,
        ctx.requestBody.deleteToTime,
        quantitySetRecords,
        accessRecords
      );
    } catch (err) {
      if (err instanceof ExpendableInventoryTypeNotFoundError) {
        throw createHttpError(NOT_FOUND, err);
      }
      throw err;
    }

    ctx.status = CREATED;
  }


  // eslint-disable-next-line max-len
  protected async handleGetAggregatedQuantityHistory(ctx: ExpendableInventoryControllerGlue.GetAggregatedQuantityHistoryContext): Promise<void> {
    const endTime = startOfHour(new Date());
    const startTime = subHours(endTime, ctx.query.pastHours);
    const timeStep: Duration = {
      minutes: 30
    };

    let history: ExpendableInventoryAggregatedQuantityHistory;
    try {
      history = await this._expendableInventoryService.getAggregatedQuantityHistory(
        startTime,
        endTime,
        timeStep,
        ctx.query.typeIds ?? null,
        ctx.query.groupBy ?? null
      );
    } catch (err) {
      if (err instanceof ExpendableInventoryTypeNotFoundError) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }

    ctx.responseBodyData = history;
  }

  // eslint-disable-next-line max-len
  protected async handleGetAggregatedAccessHistory(ctx: ExpendableInventoryControllerGlue.GetAggregatedAccessHistoryContext): Promise<void> {
    const endTime = startOfHour(new Date());
    const startTime = subHours(endTime, ctx.query.pastHours);
    const timeStep: Duration = {
      minutes: 30
    };

    let history: ExpendableInventoryAggregatedAccessHistory;
    try {
      history = await this._expendableInventoryService.getAggregatedAccessHistory(
        startTime,
        endTime,
        timeStep,
        ctx.query.typeIds ?? null,
        ctx.query.groupBy ?? null,
        ctx.query.countType ?? 'total'
      );
    } catch (err) {
      if (err instanceof ExpendableInventoryTypeNotFoundError) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }

    ctx.responseBodyData = history;
  }
}
