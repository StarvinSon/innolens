export type ToJson<T> =
  T extends Date ? string
    : T extends object ? { [K in keyof T]: ToJson<T[K]> }
      : T;
