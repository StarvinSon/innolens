import Ajv, { Ajv as AjvInstance, ValidateFunction as AjvValidateFunction } from 'ajv';


export class ValidationError extends Error {
  public readonly code = 'ERR_VALIDATION';
  public constructor(message: string) {
    super(message);
  }
}


export interface Validator<T> {
  readonly lastValidationError: string;
  validate(val: unknown): val is T;
  assert(val: unknown): asserts val is T;
}


export class ValidatorImpl<T> implements Validator<T> {
  private readonly _ajv: AjvInstance;
  private readonly _validationFunc: AjvValidateFunction;

  private _lastValidationError = '';

  public constructor(schema: object) {
    this._ajv = new Ajv({
      strictDefaults: true,
      strictKeywords: true
    });
    this._validationFunc = this._ajv.compile(schema);
  }

  public get lastValidationError(): string {
    return this._lastValidationError;
  }

  public validate(val: unknown): val is T {
    if (this._validationFunc(val)) {
      this._lastValidationError = '';
      return true;
    }
    this._lastValidationError = this._ajv.errorsText(this._validationFunc.errors, { dataVar: '' });
    return false;
  }

  public assert(val: unknown): asserts val is T {
    if (!this.validate(val)) {
      throw new ValidationError(this._lastValidationError);
    }
  }
}

export const createValidator = <T>(schema: object): Validator<T> => new ValidatorImpl(schema);
