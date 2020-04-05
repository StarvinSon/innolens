import Ajv, { Ajv as AjvInstance, ValidateFunction as AjvValidateFunction } from 'ajv';


export class ValidationError extends Error {
  public readonly code = 'ERR_VALIDATION';
  public constructor(message: string) {
    super(message);
  }
}


export class Validator<T> {
  private readonly _ajv: AjvInstance;
  private readonly _validationFunc: AjvValidateFunction;

  private _lastValidationError = '';

  public constructor(schema: object, defSchemas?: Readonly<Record<string, object>>) {
    this._ajv = new Ajv({
      strictDefaults: true,
      strictKeywords: true
    });
    if (defSchemas !== undefined) {
      for (const [id, def] of Object.entries(defSchemas)) {
        this._ajv.addSchema(def, id);
      }
    }
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
    this._lastValidationError = this._ajv.errorsText(this._validationFunc.errors, { dataVar: 'obj' });
    return false;
  }

  public assert(val: unknown): asserts val is T {
    if (!this.validate(val)) {
      throw new ValidationError(this._lastValidationError);
    }
  }
}
