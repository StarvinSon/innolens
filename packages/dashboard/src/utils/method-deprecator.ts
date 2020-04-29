import { wrapMethod } from './method-wrapper';


export const deprecated = (msg?: string): MethodDecorator => wrapMethod((method) => {
  if (process.env.NODE_ENV !== 'development') {
    return method;
  }

  const message = msg ?? `${method.name} is deprecated`;
  const deprecatedMethod = function(this: object, ...args: ReadonlyArray<any>): any {
    console.warn(message);
    return Reflect.apply(method, this, args);
  };
  return deprecatedMethod;
});
