declare global {
  interface ObjectConstructor {
    entries<T extends object>(o: T): Array<{ [K in keyof Required<T>]: [K, T[K]]; }[keyof T]>;
    // eslint-disable-next-line max-len
    fromEntries<T extends readonly [PropertyKey, unknown]>(entries: ReadonlyArray<T>): Intersect<T extends any ? { [K in T[0]]: T[1] } : never>;
  }
}

export type Writable<T> = { -readonly [K in keyof T]: T[K]; };

// eslint-disable-next-line max-len
export type Intersect<T> = (T extends any ? ((a: T) => any) : never) extends ((a: infer U) => any) ? U : never;
