import { relative } from 'path';


export interface Token<T> extends Symbol {}

export const createToken = <T>(filename: string, name: string): Token<T> =>
  Symbol(`${relative(__dirname, filename)}:${name}`);


export interface Resolver {
  resolve<T extends Resolvable>(resolvable: T): Resolve<T>;
  resolveAsync<T extends Resolvable>(resolvable: T): Promise<ResolveAsync<T>>;
  register<T>(token: Token<T>, creator: Creator<T>): void
  registerSingleton<T>(token: Token<T>, creator: Creator<T>): void
}

export type Resolvable =
  Token<any> | Creator<any> | ResolvableArray | ResolvableMap;

export interface Creator<T> {
  (resolver: Resolver): T;
}

export interface ResolvableArray extends ReadonlyArray<Resolvable> {}

export interface ResolvableMap extends Readonly<Record<PropertyKey, Resolvable>> {}


export type Resolve<T extends Resolvable> =
  T extends Token<any> ? ResolveToken<T>
    : T extends Creator<any> ? ResolveCreator<T>
      : T extends ResolvableArray | ResolvableMap ? ResolveArrayOrMap<T>
        : never;

export type ResolveToken<T extends Token<any>> =
  T extends Token<infer U> ? U : never;

export type ResolveCreator<T extends Creator<any>> =
  T extends Creator<infer U> ? U : never;

export type ResolveArrayOrMap<T extends ResolvableArray | ResolvableMap> =
  { -readonly [K in keyof T]: T[K] extends Resolvable ? Resolve<T[K]> : never; };


export type ResolveAsync<T extends Resolvable> =
  T extends Token<any> ? ResolveTokenAsync<T>
    : T extends Creator<any> ? ResolveCreatorAsync<T>
      : T extends ResolvableArray | ResolvableMap ? ResolveArrayOrMapAsync<T>
        : never;

export type ResolvePromise<T> =
  T extends PromiseLike<infer U> ? U : T;

export type ResolveTokenAsync<T extends Token<any>> =
  T extends Token<infer U> ? ResolvePromise<U> : never;

export type ResolveCreatorAsync<T extends Creator<any>> =
  T extends Creator<infer U> ? ResolvePromise<U> : never;

export type ResolveArrayOrMapAsync<T extends ResolvableArray | ResolvableMap> =
  { -readonly [K in keyof T]: T[K] extends Resolvable ? ResolveAsync<T[K]> : never; };


export const depend =
  <T, S extends Resolvable>(
    resolvable: S,
    creator: (dependency: Resolve<S>) => T
  ): Creator<T> =>
    (resolver) => creator(resolver.resolve(resolvable));

export const dependAsync =
  <T, S extends Resolvable>(
    resolvable: S,
    creator: (dependency: ResolveAsync<S>) => T | PromiseLike<T>
  ): Creator<Promise<T>> =>
    async (resolver) => creator(await resolver.resolveAsync(resolvable));


export interface Registrant {
  (resolver: Resolver): void;
}

export const createRegistrant =
  <T>(
    token: Token<T>,
    creator: Creator<T>
  ): Registrant =>
    (resolver) => resolver.register(token, creator);

export const createSingletonRegistrant =
  <T>(
    token: Token<T>,
    creator: Creator<T>
  ): Registrant =>
    (resolver) => resolver.registerSingleton(token, creator);


class ResolverImpl implements Resolver {
  private readonly _dependencyCreatorMap = new Map<Token<unknown>, Creator<unknown>>();
  private readonly _resolvingTokens = new Set<Token<unknown>>();

  public resolve<T extends Resolvable>(resolvable: T): Resolve<T> {
    if (typeof resolvable === 'function') {
      const middleware = resolvable as Creator<any>;
      return middleware(this);
    }
    if (Array.isArray(resolvable)) {
      const array: ResolvableArray = resolvable;
      return array.map((someSubToken) => this.resolve(someSubToken)) as Resolve<T>;
    }
    if (typeof resolvable === 'object') {
      const map = resolvable as ResolvableMap;
      return Object.fromEntries(Object.entries(map)
        .map(([key, someSubToken]) => [key, this.resolve(someSubToken)])) as Resolve<T>;
    }

    const token = resolvable as Token<any>;
    if (this._resolvingTokens.has(token)) {
      throw new Error(`Circular dependency detected: ${String(token)}`);
    }
    this._resolvingTokens.add(token);
    try {
      if (!this._dependencyCreatorMap.has(token)) {
        throw new Error(`Missing dependency for token: ${String(token)}`);
      }
      return this._dependencyCreatorMap.get(token)!(this) as Resolve<T>;
    } finally {
      this._resolvingTokens.delete(token);
    }
  }

  public async resolveAsync<T extends Resolvable>(resolvable: T): Promise<ResolveAsync<T>> {
    if (typeof resolvable === 'function') {
      const middleware = resolvable as Creator<any>;
      return middleware(this);
    }
    if (Array.isArray(resolvable)) {
      const array = resolvable as ResolvableArray;
      return Promise.all(array
        .map((someSubToken) => this.resolveAsync(someSubToken))) as Promise<ResolveAsync<T>>;
    }
    if (typeof resolvable === 'object') {
      const map = resolvable as ResolvableMap;
      const entryPromises = Object
        .entries(map)
        .map(async ([key, someSubToken]): Promise<[PropertyKey, unknown]> =>
          [key, await this.resolveAsync(someSubToken)]);

      return Object.fromEntries(await Promise.all(entryPromises)) as ResolveAsync<T>;
    }

    const token = resolvable as Token<any>;
    if (this._resolvingTokens.has(token)) {
      throw new Error(`Circular dependency detected: ${String(token)}`);
    }
    this._resolvingTokens.add(token);
    try {
      if (!this._dependencyCreatorMap.has(token)) {
        throw new Error(`Missing dependency for token: ${String(token)}`);
      }
      return await this._dependencyCreatorMap.get(token)!(this) as ResolveAsync<T>;
    } finally {
      this._resolvingTokens.delete(token);
    }
  }

  public register<T>(token: Token<T>, creator: Creator<T>): void {
    if (this._dependencyCreatorMap.has(token)) {
      throw new Error(`Token already exists: ${String(token)}`);
    }
    this._dependencyCreatorMap.set(token, creator);
  }

  public registerSingleton<T>(token: Token<T>, creator: Creator<T>): void {
    const empty = Symbol('empty');
    let value: T | typeof empty = empty;
    this.register(token, (r) => {
      if (value === empty) {
        value = creator(r);
      }
      return value;
    });
  }
}

export const createResolver = (): Resolver => new ResolverImpl();
