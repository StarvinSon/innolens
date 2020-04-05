import { Readable } from 'stream';

import csvParse from 'csv-parse';
import { BAD_REQUEST } from 'http-status-codes';

import { Validator } from '../../utils/validator';


export class CsvRecordValidationFailedError extends Error {
  public readonly code = 'ERR_CSV_RECORD_VALIDATION_FAILED';
  public readonly statusCode = BAD_REQUEST;
  public constructor(reason: string) {
    super(`CSV Record failed validation: ${reason}`);
  }
}


export class CsvParser<T> {
  private readonly _validator: Validator<T>;

  public constructor(schema: object) {
    this._validator = new Validator(schema);
  }

  public async *parse(fileStream: Readable): AsyncIterable<T> {
    const recordStream = fileStream.pipe(csvParse({
      columns: true
    }));
    for await (const record of recordStream) {
      if (!this._validator.validate(record)) {
        throw new CsvRecordValidationFailedError(this._validator.lastValidationError);
      }
      yield record;
    }
  }
}
