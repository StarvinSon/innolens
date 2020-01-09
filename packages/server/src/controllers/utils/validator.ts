import { BAD_REQUEST } from 'http-status-codes';

import {
  Validator, ValidationError, ValidatorImpl as BaseValidatorImpl
} from '../../utils/validator';

import { configureError } from './error-configurator';


export { Validator, ValidationError };


export class ValidatorImpl<T> extends BaseValidatorImpl<T> {
  public assert(val: T): asserts val is T {
    try {
      // @ts-ignore
      super.assert(val);
    } catch (err) {
      throw configureError(err, [
        [ValidationError, {
          statusCode: BAD_REQUEST
        }]
      ]);
    }
  }
}

export const createValidator = <T>(schema: object): Validator<T> => new ValidatorImpl<T>(schema);
