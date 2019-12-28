import { json as parseJson, form as parseForm } from 'co-body';
import { BAD_REQUEST, UNSUPPORTED_MEDIA_TYPE } from 'http-status-codes';
import { Context as KoaContext } from 'koa';

import { createError } from '../../utils/error';


export const ERR_EMPTY_BODY = 'Empty body';
export const ERR_UNSUPPORTED_CONTENT_TYPE = 'Unsupported content type';


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
        throw createError({
          statusCode: BAD_REQUEST,
          errorCode: ERR_EMPTY_BODY,
          description: 'empty body'
        });
      }
      break;
    }
    case 'application/x-www-form-urlencoded': {
      parsed = await parseForm(ctx);
      break;
    }
    default: {
      throw createError({
        statusCode: UNSUPPORTED_MEDIA_TYPE,
        errorCode: ERR_UNSUPPORTED_CONTENT_TYPE,
        description: `only support ${supportedEncodings.join(', ')}`
      });
    }
  }

  return parsed;
};
