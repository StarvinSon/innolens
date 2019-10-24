declare global {
  interface ObjectConstructor {
    entries<T extends object>(o: T): Array<{ [K in keyof T]: [K, T[K]]; }[keyof T]>;
  }
}

export type Writable<T> = { -readonly [K in keyof T]: T[K]; };
