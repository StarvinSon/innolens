import { Context } from '../context';


export type RequestBodyResult = {
  readonly type: 'successful';
  readonly body: unknown;
} | {
  readonly type: 'failed';
  readonly error: Error;
};

const requestBodyResultSym = Symbol('requestBodyResult');

export const setRequestBodyResult = (ctx: Context, result: RequestBodyResult): void =>
  Reflect.defineMetadata(requestBodyResultSym, result, ctx);

export const getRequestBodyResult = (ctx: Context): RequestBodyResult | null => {
  const result: RequestBodyResult | undefined = Reflect.getMetadata(requestBodyResultSym, ctx);
  return result ?? null;
};

export const getRequestBody = <T>(ctx: Context): T => {
  const result = getRequestBodyResult(ctx);
  if (result === null) {
    throw new Error('No request body is found');
  }
  if (result.type === 'failed') {
    Error.captureStackTrace(result.error, getRequestBody);
    throw result.error;
  }

  return result.body as T;
};
