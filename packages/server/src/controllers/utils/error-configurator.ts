export type ErrorConstructor = new (...args: ReadonlyArray<any>) => Error;

export type ErrorConfigMap = ReadonlyArray<readonly [
  ErrorConstructor | ReadonlyArray<ErrorConstructor>,
  ErrorConfig
]>;

export interface ErrorConfig {
  readonly statusCode?: number;
  readonly code?: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export const configureError = <T>(err: T, map: ErrorConfigMap): T => {
  if (typeof err === 'object') {
    for (const [constructors, config] of map) {
      for (const constructor of Array.isArray(constructors)
        ? constructors as ReadonlyArray<ErrorConstructor>
        : [constructors as ErrorConstructor]
      ) {
        if (err instanceof constructor) {
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
        }
      }
    }
  }
  return err;
};
