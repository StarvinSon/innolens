import { BAD_REQUEST } from 'http-status-codes';

import { wrapMethod } from '../../utils/method-wrapper';
import { Validator } from '../../utils/validator';
import { Context } from '../context';
import { Middleware } from '../middleware';

import { getRequestBodyResult, setRequestBodyResult, RequestBodyResult } from './request-body';


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


const validateInternal = (ctx: Context, validator: Validator<unknown>): RequestBodyResult => {
  const result = getRequestBodyResult(ctx);
  if (result === null) {
    throw new Error('Cannot find request body. Did you forget to add @parseBody?');
  } else if (result.type === 'successful' && !validator.validate(result.body)) {
    return {
      type: 'failed',
      error: new BodyValidationError(validator.lastValidationError)
    };
  }
  return result;
};

export const validateRequestBody = (
  schema: object,
  options?: { readonly noThrow?: boolean; }
): MethodDecorator => {
  const { noThrow = false } = options ?? {};
  const validator = new Validator(schema);

  return wrapMethod((method) => {
    const validate: Middleware = async function(this: object, ctx, next) {
      const result = validateInternal(ctx, validator);
      setRequestBodyResult(ctx, result);
      if (!noThrow && result.type === 'failed') {
        Error.captureStackTrace(result.error, validate);
        throw result.error;
      }
      return Reflect.apply(method, this, [ctx, next]);
    };
    return validate;
  });
};
