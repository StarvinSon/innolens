import { directive } from 'lit-html/lib/directive';

import { wrapMethod } from '../utils/method-wrapper';


export const directiveMethod = (): MethodDecorator => wrapMethod((method) => {
  const invoke = directive((target: object, args: ReadonlyArray<unknown>) =>
    Reflect.apply(method, target, args));

  const wrapped = function(this: object, ...args: ReadonlyArray<unknown>): unknown {
    return invoke(this, args);
  };
  return wrapped;
});
