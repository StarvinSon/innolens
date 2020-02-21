import {
  createToken, decorate, name,
  singleton, injectableFactory
} from '@innolens/resolver';
import { BAD_REQUEST } from 'http-status-codes';

import { wrapMethodFactory, createMethodInitializer } from '../../utils/method-wrapper';
import { InjectedValidatorFactory, Validator } from '../../utils/validator';
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


export interface BodyValidator<T> {
  validate(ctx: Context): BodyValidationResult<T>;
  validateAndGetBody(ctx: Context): T
}

export type BodyValidationResult<T> =
  FailedBodyValidationResult | SuccessfulBodyValidationResult<T>;

export interface FailedBodyValidationResult {
  readonly type: 'FAILED';
  readonly error: Error;
}

export interface SuccessfulBodyValidationResult<T> {
  readonly type: 'SUCCESSFUL';
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

export class BodyValidatorImpl<T> implements BodyValidator<T> {
  private readonly _validator: Validator<T>;
  private readonly _getBody: BodyGetter;

  public constructor(validator: Validator<T>, getBody: BodyGetter = defaultGetBody) {
    this._validator = validator;
    this._getBody = getBody;
  }

  public validate(ctx: Context): BodyValidationResult<T> {
    const body = this._getBody(ctx);
    if (body === null) {
      return {
        type: 'FAILED',
        error: new NoBodyToValidateError()
      };
    }
    if (!this._validator.validate(body)) {
      return {
        type: 'FAILED',
        error: new BodyValidationError(this._validator.lastValidationError)
      };
    }
    return {
      type: 'SUCCESSFUL',
      body: body as T
    };
  }

  public validateAndGetBody(ctx: Context): T {
    const result = this.validate(ctx);
    if (result.type === 'FAILED') {
      Error.captureStackTrace(result.error, this.validateAndGetBody);
      throw result.error;
    }
    return result.body;
  }
}


export interface InjectedBodyValidatorFactory {
  <T>(schema: object, getBody?: BodyGetter): BodyValidator<T>;
}

export const InjectedBodyValidatorFactory =
  createToken<InjectedBodyValidatorFactory>('InjectedBodyValidatorFactory');

export const createInjectedBodyValidatorFactory = decorate(
  name('createInjectedBodyValidatorFactory'),
  injectableFactory(InjectedValidatorFactory),
  singleton(),
  (validatorFactory: InjectedValidatorFactory): InjectedBodyValidatorFactory =>
    (schema, getBody) => new BodyValidatorImpl(validatorFactory(schema), getBody)
);


const bodyValidationResultSym = Symbol('bodyValidationResult');

const setBodyValidationResult = (ctx: Context, result: BodyValidationResult<unknown>): void => {
  Reflect.defineMetadata(bodyValidationResultSym, result, ctx);
};

export const getBodyValidationResult = <T>(ctx: Context): BodyValidationResult<T> => {
  const result = Reflect.getMetadata(bodyValidationResultSym, ctx);
  if (result === undefined) {
    throw new Error('There is no body validation result');
  }
  return result;
};

export const getValidatedBody = <T>(ctx: Context): T => {
  const result = getBodyValidationResult<T>(ctx);
  if (result.type === 'FAILED') {
    Error.captureStackTrace(result.error, getValidatedBody);
    throw result.error;
  }
  return result.body;
};


type ValidateBodyInitializerArgs = [InjectedBodyValidatorFactory];

const validateBodyName = 'validateBody';
const validateBodyInitializersSym = Symbol('validateBodyInitializers');

export const validateBody =
  (schema: object, options?: {
    noThrow?: boolean;
    getBody?: BodyGetter;
  }): MethodDecorator => {
    const noThrow = options?.noThrow ?? false;

    return wrapMethodFactory<ValidateBodyInitializerArgs>(
      validateBodyName,
      validateBodyInitializersSym,
      (method) => ($this, validatorFactory) => {
        const bodyValidator = validatorFactory(schema, options?.getBody);

        const validateBodyHandler: Middleware = async function(this: object, ctx, next) {
          const result = bodyValidator.validate(ctx);
          setBodyValidationResult(ctx, result);
          if (!noThrow && result.type === 'FAILED') {
            Error.captureStackTrace(result.error, validateBodyHandler);
            throw result.error;
          }

          return Reflect.apply(method, this, [ctx, next]);
        };
        return validateBodyHandler;
      }
    );
  };

export const initializeValidateBody =
  createMethodInitializer<ValidateBodyInitializerArgs>(
    validateBodyName,
    validateBodyInitializersSym
  );
