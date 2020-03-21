import {
  IncomingForm, Fields, Files,
  File
} from 'formidable';

import { wrapMethod } from '../../utils/method-wrapper';
import { Context } from '../context';
import { Middleware } from '../middleware';

import { UnsupportedContentTypeError } from './body-parser';


export { UnsupportedContentTypeError };


export type FormDataBodyParseResult =
  FailedFormDataBodyParseResult | SuccessfulFormDataBodyParseResult;

export interface FailedFormDataBodyParseResult {
  readonly type: 'failed';
  readonly error: Error;
}

export interface SuccessfulFormDataBodyParseResult {
  readonly type: 'successful';
  readonly body: {
    readonly [key: string]: ReadonlyArray<string | Readonly<File>>;
  };
}


export class FormDataBodyParser {
  public async parse(ctx: Context): Promise<FormDataBodyParseResult> {
    switch (ctx.is('multipart/form-data')) {
      case 'multipart/form-data': {
        const form = new IncomingForm();
        const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
          form.parse(ctx.req, (err, _fields, _files) => {
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
        return {
          type: 'successful',
          body
        };
      }
      default: {
        return {
          type: 'failed',
          error: new UnsupportedContentTypeError(['multipart/form-data'])
        };
      }
    }
  }
}


const formDataBodyParseResultSym = Symbol('formDataBodyParseResult');

const setFormDataBodyParseResult = (ctx: Context, result: FormDataBodyParseResult): void =>
  Reflect.defineMetadata(formDataBodyParseResultSym, result, ctx);

export const getFormDataBodyParseResult = (ctx: Context): FormDataBodyParseResult => {
  const result: FormDataBodyParseResult | undefined =
    Reflect.getMetadata(formDataBodyParseResultSym, ctx);
  if (result === undefined) {
    throw new Error('Failed to retrieve parse result');
  }
  return result;
};

export const getFormDataBody = (ctx: Context): SuccessfulFormDataBodyParseResult['body'] => {
  const result = getFormDataBodyParseResult(ctx);
  if (result.type === 'failed') {
    Error.captureStackTrace(result.error, getFormDataBody);
    throw result.error;
  }
  return result.body;
};


export interface ParseFormDataBodyOptions {
  readonly noThrow: boolean;
}

export const parseFormDataBody = (options?: ParseFormDataBodyOptions): MethodDecorator =>
  wrapMethod((method) => {
    const { noThrow = false } = options ?? {};

    const parse: Middleware = async function(this: object, ctx, next) {
      const parser = new FormDataBodyParser();
      const result = await parser.parse(ctx);
      setFormDataBodyParseResult(ctx, result);
      if (!noThrow && result.type === 'failed') {
        Error.captureStackTrace(result.error, parse);
        throw result.error;
      }

      return Reflect.apply(method, this, [ctx, next]);
    };
    return parse;
  });
