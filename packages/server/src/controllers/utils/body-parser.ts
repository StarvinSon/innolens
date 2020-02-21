import {
  createToken, decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import { json as parseJson, form as parseForm } from 'co-body';
import { BAD_REQUEST, UNSUPPORTED_MEDIA_TYPE } from 'http-status-codes';
import { Context as KoaContext } from 'koa';

import { wrapMethodFactory, createMethodInitializer } from '../../utils/method-wrapper';
import { Context } from '../context';
import { Middleware } from '../middleware';


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


export interface BodyParserOptions {
  readonly json?: boolean;
  readonly form?: boolean;
}

export interface BodyParser {
  parse(ctx: KoaContext): Promise<BodyParseResult>;
  parseAndGetBody(ctx: KoaContext): Promise<unknown>;
}

export type BodyParseResult = FailedBodyParseResult | SuccessfulBodyParseResult;

export interface FailedBodyParseResult {
  readonly type: 'FAILED';
  readonly error: Error;
}

export interface SuccessfulBodyParseResult {
  readonly type: 'SUCCESSFUL';
  readonly body: unknown;
  readonly rawBody: string;
}


export class BodyParserImpl implements BodyParser {
  public readonly supportedEncodings: ReadonlyArray<string>;

  public constructor(options?: BodyParserOptions) {
    this.supportedEncodings = [
      ...options?.json ?? true ? ['application/json'] : [],
      ...options?.form ?? false ? ['application/x-www-form-urlencoded'] : []
    ];
  }

  public async parse(ctx: KoaContext): Promise<BodyParseResult> {
    let parsed: unknown;
    let raw: string;
    switch (ctx.is(...this.supportedEncodings)) {
      case 'application/json': {
        ({ parsed, raw } = await parseJson(ctx, {
          strict: true,
          returnRawBody: true
        }));
        if (raw.length === 0) {
          return {
            type: 'FAILED',
            error: new EmptyBodyError()
          };
        }
        break;
      }
      case 'application/x-www-form-urlencoded': {
        ({ parsed, raw } = await parseForm(ctx, { returnRawBody: true }));
        break;
      }
      default: {
        return {
          type: 'FAILED',
          error: new UnsupportedContentTypeError(this.supportedEncodings)
        };
      }
    }

    return {
      type: 'SUCCESSFUL',
      body: parsed,
      rawBody: raw
    };
  }

  public async parseAndGetBody(ctx: KoaContext): Promise<Omit<SuccessfulBodyParseResult, 'type'>> {
    const result = await this.parse(ctx);
    if (result.type === 'FAILED') {
      Error.captureStackTrace(result.error, this.parseAndGetBody);
      throw result.error;
    }
    return {
      body: result.body,
      rawBody: result.rawBody
    };
  }
}


export interface InjectedBodyParserFactory {
  (options?: BodyParserOptions): BodyParser;
}

export const InjectedBodyParserFactory =
  createToken<InjectedBodyParserFactory>('InjectedBodyParserFactory');

export const createInjectedBodyParserFactory = decorate(
  name('createInjectedBodyParserFactory'),
  injectableFactory(),
  singleton(),
  (): InjectedBodyParserFactory =>
    (options) => new BodyParserImpl(options)
);


const bodyParseResultSym = Symbol('bodyParseResult');

const setBodyParseResult = (ctx: Context, result: BodyParseResult): void =>
  Reflect.defineMetadata(bodyParseResultSym, result, ctx);

export const getBodyParseResult = (ctx: Context): BodyParseResult => {
  const result: BodyParseResult | undefined = Reflect.getMetadata(bodyParseResultSym, ctx);
  if (result === undefined) {
    throw new Error('Failed to retrieve parse result');
  }
  return result;
};

export const getParsedBody = (ctx: Context): Omit<SuccessfulBodyParseResult, 'type'> => {
  const result = getBodyParseResult(ctx);
  if (result.type === 'FAILED') {
    Error.captureStackTrace(result.error, getParsedBody);
    throw result.error;
  }
  return {
    body: result.body,
    rawBody: result.rawBody
  };
};


export interface ParseBodyOptions extends BodyParserOptions {
  readonly noThrow?: boolean;
}

type ParseBodyInitializerArgs = [InjectedBodyParserFactory];

const parseBodyName = 'parseBody';
const parseBodyInitializersSym = Symbol('parseBodyInitializers');

export const parseBody =
  (options?: ParseBodyOptions): MethodDecorator => {
    const noThrow = options?.noThrow ?? false;

    return wrapMethodFactory<ParseBodyInitializerArgs>(
      parseBodyName,
      parseBodyInitializersSym,
      (method) => ($this, injectedParserFactory) => {
        const bodyParser = injectedParserFactory(options);

        const parse: Middleware = async function(this: object, ctx, next) {
          const result = await bodyParser.parse(ctx);
          setBodyParseResult(ctx, result);
          if (!noThrow && result.type === 'FAILED') {
            Error.captureStackTrace(result.error, parse);
            throw result.error;
          }

          return Reflect.apply(method, this, [ctx, next]);
        };
        return parse;
      }
    );
  };

export const initializeParseBody =
  createMethodInitializer<ParseBodyInitializerArgs>(parseBodyName, parseBodyInitializersSym);
