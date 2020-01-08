import { BAD_REQUEST } from 'http-status-codes';

import {
  Validator, ValidationError, createValidator as createBaseValidator
} from '../../utils/validator';

import { configureError } from './error-configurator';


export { Validator, ValidationError };

export const createValidator = <T>(schema: object): Validator<T> => {
  const baseValidator: Validator<T> = createBaseValidator(schema);
  return (obj) => {
    try {
      baseValidator(obj);
    } catch (err) {
      throw configureError(err, [
        [ValidationError, {
          statusCode: BAD_REQUEST
        }]
      ]);
    }
  };
};
