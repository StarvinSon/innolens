import { wrapMethod } from '../../utils/method-wrapper';
import { Middleware } from '../middleware';


export type ErrorConstructor = new (...args: ReadonlyArray<any>) => Error;

export type ErrorConfigs = ReadonlyArray<readonly [
  ErrorConstructor | ReadonlyArray<ErrorConstructor>,
  ErrorConfig | ErrorMapper
]>;

export interface ErrorConfig {
  readonly statusCode?: number;
  readonly code?: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface ErrorMapper {
  (err: Error): Error;
}

export const configureError = (err: Error, map: ErrorConfigs): Error => {
  if (typeof err === 'object') {
    for (const [constructors, config] of map) {
      for (const constructor of Array.isArray(constructors)
        ? constructors as ReadonlyArray<ErrorConstructor>
        : [constructors as ErrorConstructor]
      ) {
        if (err instanceof constructor) {
          if (typeof config === 'function') {
            return config(err);
          }

          for (const key of ['statusCode', 'code', 'headers'] as const) {
            const val = config[key];
            if (val !== undefined) {
              Reflect.defineProperty(err as any, key, {
                configurable: true,
                enumerable: true,
                value: val,
                writable: true
              });
            }
          }
          return err;
        }
      }
    }
  }
  return err;
};

export const mapError = (configs: ErrorConfigs): MethodDecorator => wrapMethod((method) => {
  const mapErrorMethod: Middleware = async function(this: object, ctx, next) {
    try {
      return await Reflect.apply(method, this, [ctx, next]);
    } catch (err) {
      throw configureError(err, configs);
    }
  };
  return mapErrorMethod;
});
