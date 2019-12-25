import Ajv from 'ajv';
import { Context as KoaContext } from 'koa';
import { UNAUTHORIZED, BAD_REQUEST, UNSUPPORTED_MEDIA_TYPE } from 'http-status-codes';
import { json as parseJson, form as parseForm } from 'co-body';

import { ClientsService, Client } from '../services/client';
import { createError } from '../utils/error';
import { DependencyCreator } from '../app-context';


export const ERR_CLIENT_AUTHENTICATION_FAILED = 'Client authentication failed';
export const ERR_EMPTY_BODY = 'Empty body';
export const ERR_UNSUPPORTED_CONTENT_TYPE = 'Unsupported content type';
export const ERR_VALIDATION_FAILED = 'Validation failed';


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
          errorCode: ERR_EMPTY_BODY
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
        errorCode: ERR_UNSUPPORTED_CONTENT_TYPE
      });
    }
  }

  return parsed;
};


export interface Validator<T> {
  (obj: unknown): asserts obj is T;
}

export const createValidator = <T>(schema: object): Validator<T> => {
  const ajv = new Ajv({
    strictDefaults: true,
    strictKeywords: true
  });
  const validateValue = ajv.compile(schema);

  const validate: Validator<T> = (value) => {
    if (!validateValue(value)) {
      throw createError({
        statusCode: BAD_REQUEST,
        errorCode: ERR_VALIDATION_FAILED,
        description: ajv.errorsText(validateValue.errors, { dataVar: '' })
      });
    }
  };

  return validate;
};


export interface ClientAuthenticator {
  (ctx: KoaContext): Promise<Client>;
}

// eslint-disable-next-line max-len
export const createClientAuthenticator: DependencyCreator<Promise<ClientAuthenticator>> = async (appCtx) => {
  const clientsService = await appCtx.resolve(ClientsService);

  const authenticateClient: ClientAuthenticator = async (ctx) => {
    const auth = ctx.get('Authorization');

    const parts = auth === undefined || !auth.startsWith('Basic ')
      ? null
      : Buffer
        .from(auth.slice('Basic '.length), 'base64')
        .toString()
        .split(':', 2);

    const client = parts !== null && parts.length === 2
      ? await clientsService.findByCredentials({
        publicId: parts[0],
        secret: parts[1]
      })
      : null;

    if (client === null) {
      throw createError({
        statusCode: UNAUTHORIZED,
        headers: { 'WWW-AUTHENTICATE': 'Basic' },
        errorCode: ERR_CLIENT_AUTHENTICATION_FAILED,
        description: 'Failed to authenticate client'
      });
    }

    return client;
  };

  return authenticateClient;
};
