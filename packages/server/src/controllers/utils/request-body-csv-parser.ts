
import { createReadStream } from 'fs';

import parseCsv from 'csv-parse';
import File from 'formidable/lib/file';
import { BAD_REQUEST } from 'http-status-codes';

import { wrapMethod } from '../../utils/method-wrapper';
import { Context } from '../context';
import { Middleware } from '../middleware';

import { getRequestBodyResult, setRequestBodyResult, RequestBodyResult } from './request-body';


export class MissingFormFieldError extends Error {
  public readonly code = 'ERR_BODY_VALIDATION_FAILED';
  public readonly statusCode = BAD_REQUEST;
  public constructor(name: string) {
    super(`Missing form field: ${name}`);
  }
}


const parseRequestBodyCsvInternal = async (
  ctx: Context,
  name: string
): Promise<RequestBodyResult> => {
  const result = getRequestBodyResult(ctx);
  if (result === null) {
    throw new Error('Cannot find request body. Did you forget to add @parseBody?');
  }
  if (result.type !== 'successful') {
    return result;
  }
  if (typeof result.body !== 'object' || result.body === null) {
    throw new Error('Incompatible result body. Expect an object.');
  }
  if ((result.body as any)[name] === undefined) {
    return {
      type: 'failed',
      error: new MissingFormFieldError(name)
    };
  }

  let file: File;
  if (
    !Array.isArray((result.body as any)[name])
    // eslint-disable-next-line prefer-destructuring
    || !((file = (result.body as any)[name][0]) instanceof File)
  ) {
    throw new Error('Incompatible result body');
  }

  const stream = createReadStream(file.path)
    .pipe(parseCsv({
      columns: true
    }));
  const records: Array<unknown> = [];
  for await (const record of stream) {
    records.push(record);
  }
  return {
    type: 'successful',
    body: {
      ...result.body,
      [name]: records
    }
  };
};

export const parseRequestBodyCsv = (
  name: string,
  options?: { noThrow?: boolean }
): MethodDecorator => wrapMethod((method) => {
  const { noThrow = false } = options ?? {};

  const parse: Middleware = async function(this: object, ctx, next) {
    const result = await parseRequestBodyCsvInternal(ctx, name);
    setRequestBodyResult(ctx, result);
    if (result.type === 'failed' && !noThrow) {
      Error.captureStackTrace(result.error, parse);
      throw result.error;
    }
    return Reflect.apply(method, this, [ctx, next]);
  };
  return parse;
});
