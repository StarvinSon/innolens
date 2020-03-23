import { wrapMethod } from '../../utils/method-wrapper';
import { Validator } from '../../utils/validator';
import { Context } from '../context';
import { Middleware } from '../middleware';


export type ResponseBodyValidationResult =
  SuccessfulResponseBodyValidationResult | FailedResponseBodyValidationResult;

export interface SuccessfulResponseBodyValidationResult {
  readonly type: 'successful';
}

export interface FailedResponseBodyValidationResult {
  readonly type: 'failed';
  readonly error: Error;
}

export class ResponseBodyValidator<T> {
  private readonly _validator: Validator<T>;

  public constructor(schema: object) {
    this._validator = new Validator(schema);
  }

  public validate(ctx: Context): ResponseBodyValidationResult {
    if (!this._validator.validate(ctx.body)) {
      return {
        type: 'failed',
        error: new Error(`Response body validation failed: ${this._validator.lastValidationError}`)
      };
    }
    return {
      type: 'successful'
    };
  }
}


export const validateResponseBody = (schema: object): MethodDecorator => wrapMethod((method) => {
  const validator = new ResponseBodyValidator(schema);
  const validate: Middleware = async function(this: object, ctx, next) {
    await Reflect.apply(method, this, [ctx, next]);
    const result = validator.validate(ctx);
    if (result.type === 'failed') {
      Error.captureStackTrace(result.error, validate);
      throw result.error;
    }
  };
  return validate;
});
