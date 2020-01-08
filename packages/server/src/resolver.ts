import { relative } from 'path';


export interface Resolver {
  resolve<T>(token: TokenOrCreator<T>): T;
  resolveAll<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): ResolveAllResult<T>;
  // eslint-disable-next-line max-len
  resolveAllAsync<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): Promise<ResolveAllAsyncResult<T>>;
  // eslint-disable-next-line max-len
  resolveObj<T extends Readonly<Record<PropertyKey, TokenOrCreator<any>>>>(tokenMap: T): ResolveObjResult<T>;
  // eslint-disable-next-line max-len
  resolveObjAsync<T extends Readonly<Record<PropertyKey, TokenOrCreator<any>>>>(tokenMap: T): Promise<ResolveObjAsyncResult<T>>;
  register<T>(token: Token<T>, creator: ResolverFunction<T>): void
  registerSingleton<T>(token: Token<T>, creator: ResolverFunction<T>): void
}

export interface Token<T> extends Symbol {}

export type TokenOrCreator<T> = Token<T> | ResolverFunction<T>;

export type TokenMap = Readonly<Record<PropertyKey, TokenOrCreator<any>>>;

export interface ResolverFunction<T = void, A extends ReadonlyArray<any> = []> {
  (resolver: Resolver, ...args: A): T;
}

export type ResolveAllResult<T extends ReadonlyArray<TokenOrCreator<any>>> = {
  -readonly [K in keyof T]: T[K] extends TokenOrCreator<infer U> ? U : never;
};

export type ResolveObjResult<T extends TokenMap> = {
  -readonly [K in keyof T]: T[K] extends TokenOrCreator<infer U> ? U : never;
};

export type ResolveAllAsyncResult<T extends ReadonlyArray<TokenOrCreator<any>>> = {
  // eslint-disable-next-line max-len
  -readonly [K in keyof T]: ResolveAllResult<T>[K] extends PromiseLike<infer U> ? U : ResolveAllResult<T>[K];
};

export type ResolveObjAsyncResult<T extends TokenMap> = {
  // eslint-disable-next-line max-len
  -readonly [K in keyof T]: ResolveObjResult<T>[K] extends PromiseLike<infer U> ? U : ResolveObjResult<T>[K];
};


export const createToken = <T>(filename: string, name: string): Token<T> =>
  Symbol(`${relative(__dirname, filename)}:${name}`);


export const createSingletonRegistrant = <T, M extends TokenMap>(
  token: Token<T>,
  dependencyMap: M,
  creator: (dependencies: ResolveObjResult<M>) => T
): ResolverFunction => {
  const register: ResolverFunction = (resolver) => resolver.registerSingleton(
    token,
    (r) => creator(r.resolveObj(dependencyMap))
  );
  return register;
};

export const createAsyncSingletonRegistrant = <T, M extends TokenMap>(
  token: Token<Promise<T>>,
  dependencyMap: M,
  creator: (dependencies: ResolveObjAsyncResult<M>) => T | Promise<T>
): ResolverFunction => {
  const register: ResolverFunction = (resolver) => resolver.registerSingleton(
    token,
    async (r) => creator(await r.resolveObjAsync(dependencyMap))
  );
  return register;
};

class ResolverImpl implements Resolver {
  private readonly _dependencyCreatorMap = new Map<Token<unknown>, ResolverFunction<unknown>>();
  private readonly _resolvingTokens = new Set<Token<unknown>>();

  public resolve<T>(token: TokenOrCreator<T>): T {
    if (typeof token === 'function') {
      return token(this);
    }
    if (this._resolvingTokens.has(token)) {
      throw new Error(`Circular dependency detected: ${String(token)}`);
    }
    this._resolvingTokens.add(token);
    try {
      if (!this._dependencyCreatorMap.has(token)) {
        throw new Error(`Missing dependency for token: ${String(token)}`);
      }
      return this._dependencyCreatorMap.get(token)!(this) as T;
    } finally {
      this._resolvingTokens.delete(token);
    }
  }

  // eslint-disable-next-line max-len
  public resolveAll<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): ResolveAllResult<T> {
    return tokens.map((token) => this.resolve(token)) as ResolveAllResult<T>;
  }

  // eslint-disable-next-line max-len
  public resolveObj<T extends Readonly<Record<PropertyKey, TokenOrCreator<any>>>>(tokenMap: T): ResolveObjResult<T> {
    return Object.fromEntries(Object.entries(tokenMap)
      .map(([key, token]) => [key, this.resolve(token)]));
  }

  // eslint-disable-next-line max-len
  public async resolveAllAsync<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): Promise<ResolveAllAsyncResult<T>> {
    return Promise.all(this.resolveAll(...tokens)) as Promise<ResolveAllAsyncResult<T>>;
  }

  // eslint-disable-next-line max-len
  public async resolveObjAsync<T extends Readonly<Record<PropertyKey, TokenOrCreator<any>>>>(tokenMap: T): Promise<ResolveObjAsyncResult<T>> {
    return Object.entries(this.resolveObj(tokenMap))
      .reduce(async (mapPromise, [key, valPromise]) => {
        const [map, val] = await Promise.all([mapPromise, valPromise]);
        (map as any)[key] = val;
        return map;
      }, Promise.resolve({} as ResolveObjAsyncResult<T>));
  }

  public register<T>(token: Token<T>, creator: ResolverFunction<T>): void {
    if (this._dependencyCreatorMap.has(token)) {
      throw new Error(`Token already exists: ${String(token)}`);
    }
    this._dependencyCreatorMap.set(token, creator);
  }

  public registerSingleton<T>(token: Token<T>, creator: ResolverFunction<T>): void {
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
