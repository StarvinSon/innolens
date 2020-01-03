import Ajv from 'ajv';
import { BAD_REQUEST } from 'http-status-codes';

import { createError } from '../../utils/error';


export const ERR_VALIDATION_FAILED = 'Validation failed';


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
