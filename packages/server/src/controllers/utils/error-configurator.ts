type Constructor = new (...args: ReadonlyArray<any>) => any;

export type ErrorConfigMap = ReadonlyArray<readonly [Constructor, ErrorConfig]>;

export interface ErrorConfig {
  readonly statusCode?: number;
  readonly code?: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export const configureError = <T>(err: T, map: ErrorConfigMap): T => {
  if (typeof err === 'object') {
    for (const [constructor, config] of map) {
      if (err instanceof constructor) {
        const normalizedConfig = {
          statusCode: config.statusCode,
          code: config.code,
          headers: config.headers
        };
        Object.entries(normalizedConfig)
          .forEach(([key, val]) => {
            Reflect.defineProperty(err as any, key, {
              configurable: true,
              enumerable: true,
              value: val,
              writable: true
            });
          });
      }
    }
  }
  return err;
};
