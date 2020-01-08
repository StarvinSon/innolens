import { json as parseJson, form as parseForm } from 'co-body';
import { BAD_REQUEST, UNSUPPORTED_MEDIA_TYPE } from 'http-status-codes';
import { Context as KoaContext } from 'koa';


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

export const parseBody = async (ctx: KoaContext, options?: BodyParserOptions): Promise<unknown> => {
  const supportedEncodings = [
    ...options?.json ?? true ? ['application/json'] : [],
    ...options?.form ?? false ? ['application/x-www-form-urlencoded'] : []
  ] as const;

  let parsed: unknown;
  switch (ctx.is(...supportedEncodings)) {
    case 'application/json': {
      let raw: string;
      ({ parsed, raw } = await parseJson(ctx, {
        strict: true,
        returnRawBody: true
      }));
      if (raw.length === 0) {
        throw new EmptyBodyError();
      }
      break;
    }
    case 'application/x-www-form-urlencoded': {
      parsed = await parseForm(ctx);
      break;
    }
    default: {
      throw new UnsupportedContentTypeError(supportedEncodings);
    }
  }

  return parsed;
};
