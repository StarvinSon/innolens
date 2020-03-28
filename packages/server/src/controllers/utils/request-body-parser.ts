import { promises as fsPromises } from 'fs';

import { json as parseJson, form as parseForm } from 'co-body';
import {
  IncomingForm, Fields, Files,
  File
} from 'formidable';
import { BAD_REQUEST, UNSUPPORTED_MEDIA_TYPE } from 'http-status-codes';

import { Logger } from '../../logger';
import { wrapMethod } from '../../utils/method-wrapper';
import { Context } from '../context';
import { Middleware } from '../middleware';

import { RequestBodyResult, setRequestBodyResult } from './request-body';


export class EmptyBodyError extends Error {
  public readonly code = 'ERR_EMPTY_BODY';
  public readonly statusCode = BAD_REQUEST;
  public constructor() {
    super('Body is empty');
  }
}

export class UnsupportedContentTypeError extends Error {
  public readonly code = 'ERR_UNSUPPORTED_CONTENT_TYPE';
  public readonly statusCode = UNSUPPORTED_MEDIA_TYPE;
  public constructor(supportedTypes: ReadonlyArray<string>) {
    super(`Only support ${supportedTypes.join(', ')}`);
  }
}


export const useParseRequestBody$loggerSym = Symbol('useParseRequestBody$loggerSym');

declare abstract class UseParseRequestBody {
  public constructor(...args: Array<any>);
  protected abstract readonly [useParseRequestBody$loggerSym]: Logger;
}

const useParseRequestBodyPrototypes = new WeakSet<object>();

const instanceOfUseParseRequestBody = (val: unknown): val is UseParseRequestBody => {
  if (typeof val === 'object' && val !== null) {
    for (
      let proto = Reflect.getPrototypeOf(val);
      proto !== null;
      proto = Reflect.getPrototypeOf(proto)
    ) {
      if (useParseRequestBodyPrototypes.has(proto)) {
        return true;
      }
    }
  }
  return false;
};

export const useParseRequestBody =
  <T extends Function>(base: T): (typeof UseParseRequestBody) & T => {
    abstract class AbstractUseParseRequestBody extends (base as any) {
      protected abstract readonly [useParseRequestBody$loggerSym]: Logger;
    }
    useParseRequestBodyPrototypes.add(AbstractUseParseRequestBody.prototype);
    return AbstractUseParseRequestBody as any;
  };


export type RequestBodyParserSupportedContentType =
  'application/json'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data';

const parseRequestBodyInternal = async (
  ctx: Context,
  contentTypes: ReadonlyArray<RequestBodyParserSupportedContentType>,
  logger: Logger
): Promise<RequestBodyResult & { cleanup?: () => Promise<void> }> => {
  switch (ctx.is(...contentTypes)) {
    case 'application/json': {
      const { parsed: body, raw }: { parsed: any, raw: string } = await parseJson(ctx, {
        strict: true,
        returnRawBody: true
      });
      if (raw.length === 0) {
        return {
          type: 'failed',
          error: new EmptyBodyError()
        };
      }
      return {
        type: 'successful',
        body
      };
    }
    case 'application/x-www-form-urlencoded': {
      const body = await parseForm(ctx);
      return {
        type: 'successful',
        body
      };
    }
    case 'multipart/form-data': {
      const parser = new IncomingForm();
      const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
        parser.parse(ctx.req, (err, _fields, _files) => {
          if (err) {
            reject(err);
            return;
          }
          resolve([_fields, _files]);
        });
      });
      const body: Record<string, Array<string | File>> = {};
      for (const [name, value] of [...Object.entries(fields), ...Object.entries(files)]) {
        const values = body[name] ?? (body[name] = []);
        if (Array.isArray(value)) values.push(...value);
        else values.push(value);
      }
      const cleanupFiles = Array.from(Object.values(files));
      return {
        type: 'successful',
        body,
        cleanup: async () => {
          const unlinkResults = await Promise.allSettled(cleanupFiles
            .map(async (file) => fsPromises.unlink(file.path)));
          for (const unlinkResult of unlinkResults) {
            if (unlinkResult.status === 'rejected') {
              logger.error(unlinkResult.reason);
            }
          }
        }
      };
    }
    default: {
      return {
        type: 'failed',
        error: new UnsupportedContentTypeError(contentTypes)
      };
    }
  }
};

export const parseRequestBody = (
  contentTypes: RequestBodyParserSupportedContentType | ReadonlyArray<RequestBodyParserSupportedContentType> = 'application/json',
  options?: { readonly noThrow?: boolean }
): MethodDecorator => {
  const { noThrow = false } = options ?? {};

  return wrapMethod((method, target) => {
    if (!instanceOfUseParseRequestBody(target)) {
      throw new TypeError('@parseRequestBody is not enabled for this class');
    }

    const supportedContentTypes: ReadonlyArray<RequestBodyParserSupportedContentType> =
      Array.isArray(contentTypes) ? contentTypes : [contentTypes];

    const parse: Middleware = async function(this: UseParseRequestBody, ctx, next) {
      const { cleanup, ...result } = await parseRequestBodyInternal(
        ctx,
        supportedContentTypes,
        this[useParseRequestBody$loggerSym]
      );
      setRequestBodyResult(ctx, result);
      try {
        if (!noThrow && result.type === 'failed') {
          Error.captureStackTrace(result.error, parse);
          throw result.error;
        }
        return await Reflect.apply(method, this, [ctx, next]);
      } finally {
        await cleanup?.();
      }
    };
    return parse;
  });
};
