import { wrapMethod } from '../../utils/method-wrapper';
import { Validator } from '../../utils/validator';
import { Middleware } from '../middleware';


export const validateResponseBody = (schema: object): MethodDecorator => wrapMethod((method) => {
  const validator = new Validator(schema);
  const validate: Middleware = async function(this: object, ctx, next) {
    await Reflect.apply(method, this, [ctx, next]);
    if (!validator.validate(ctx.body)) {
      throw new Error(`Response body validation failed: ${validator.lastValidationError}`);
    }
  };
  return validate;
});
