import { BAD_REQUEST } from 'http-status-codes';

import { wrapMethod } from '../../utils/method-wrapper';
import { Validator } from '../../utils/validator';
import { Context } from '../context';
import { Middleware } from '../middleware';

import { getBodyParseResult } from './body-parser';


export class NoBodyToValidateError extends Error {
  public readonly code = 'ERR_NO_BODY_TO_VALIDATE';
  public readonly statusCode = BAD_REQUEST;
  public constructor() {
    super('No body to validate');
  }
}

export class BodyValidationError extends Error {
  public readonly code = 'ERR_BODY_VALIDATION_FAILED';
  public readonly statusCode = BAD_REQUEST;
  public constructor(reason: string) {
    super(`Body validation failed: ${reason}`);
  }
}


export type RequestBodyValidationResult<T> =
  FailedRequestBodyValidationResult | SuccessfulRequestBodyValidationResult<T>;

export interface FailedRequestBodyValidationResult {
  readonly type: 'failed';
  readonly error: Error;
}

export interface SuccessfulRequestBodyValidationResult<T> {
  readonly type: 'successful';
  readonly body: T;
}


export interface BodyGetter {
  (ctx: Context): unknown;
}

const defaultGetBody: BodyGetter = (ctx) => {
  const result = getBodyParseResult(ctx);
  if (result.type === 'FAILED') {
    return null;
  }
  return result.body;
};


export class RequestBodyValidator<T> {
  private readonly _validator: Validator<T>;
  private readonly _getBody: BodyGetter;

  public constructor(schema: object, getBody: BodyGetter = defaultGetBody) {
    this._validator = new Validator(schema);
    this._getBody = getBody;
  }

  public validate(ctx: Context): RequestBodyValidationResult<T> {
    const body = this._getBody(ctx);
    if (body === null) {
      return {
        type: 'failed',
        error: new NoBodyToValidateError()
      };
    }
    if (!this._validator.validate(body)) {
      return {
        type: 'failed',
        error: new BodyValidationError(this._validator.lastValidationError)
      };
    }
    return {
      type: 'successful',
      body: body as T
    };
  }
}


const requestBodyValidationResultSym = Symbol('requestBodyValidationResult');

const setRequestBodyValidationResult =
  (ctx: Context, result: RequestBodyValidationResult<unknown>): void => {
    Reflect.defineMetadata(requestBodyValidationResultSym, result, ctx);
  };

export const getRequestBodyValidationResult = <T>(ctx: Context): RequestBodyValidationResult<T> => {
  const result = Reflect.getMetadata(requestBodyValidationResultSym, ctx);
  if (result === undefined) {
    throw new Error('There is no body validation result');
  }
  return result;
};

export const getValidatedRequestBody = <T>(ctx: Context): T => {
  const result = getRequestBodyValidationResult<T>(ctx);
  if (result.type === 'failed') {
    Error.captureStackTrace(result.error, getValidatedRequestBody);
    throw result.error;
  }
  return result.body;
};


export const validateRequestBody =
  (schema: object, options?: {
    readonly noThrow?: boolean;
    readonly getBody?: BodyGetter;
  }): MethodDecorator => {
    const {
      noThrow = false,
      getBody = defaultGetBody
    } = options ?? {};

    const validator = new RequestBodyValidator(schema, getBody);
    return wrapMethod((method) => {
      const validate: Middleware = async function(this: object, ctx, next) {
        const result = validator.validate(ctx);
        setRequestBodyValidationResult(ctx, result);
        if (!noThrow && result.type === 'failed') {
          Error.captureStackTrace(result.error, validate);
          throw result.error;
        }

        return Reflect.apply(method, this, [ctx, next]);
      };
      return validate;
    });
  };
