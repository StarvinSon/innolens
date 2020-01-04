import Ajv from 'ajv';


export class ValidationError extends Error {
  public readonly code = 'ERR_VALIDATION';
  public constructor(message: string) {
    super(message);
  }
}


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
      throw new ValidationError(ajv.errorsText(validateValue.errors, { dataVar: '' }));
    }
  };

  return validate;
};
