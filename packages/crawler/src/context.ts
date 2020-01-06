import { relative } from 'path';


export interface Context {
  resolve<T>(token: TokenOrCreator<T>): T;
  resolveAll<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): ResolveAllResult<T>;
  // eslint-disable-next-line max-len
  resolveAllAsync<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): ResolveAllAsyncResult<T>;
  registerDependency<T>(token: Token<T>, creator: ContextFunction<T>): void;
  registerSingletonDependency<T>(token: Token<T>, creator: ContextFunction<T>): void;
}

export interface Token<T> extends Symbol {}

export interface ContextFunction<T = void, A extends ReadonlyArray<any> = []> {
  (ctx: Context, ...args: A): T;
}

export type TokenOrCreator<T> = Token<T> | ContextFunction<T>;

export type ResolveAllResult<T extends ReadonlyArray<TokenOrCreator<any>>> = {
  -readonly [K in keyof T]: T[K] extends TokenOrCreator<infer U> ? U : never;
};

export type ResolveAllAsyncResult<T extends ReadonlyArray<TokenOrCreator<any>>> = Promise<{
  // eslint-disable-next-line max-len
  -readonly [K in keyof T]: ResolveAllResult<T>[K] extends PromiseLike<infer U> ? U : ResolveAllResult<T>[K];
}>;

export const createToken = <T>(filename: string, name: string): Token<T> =>
  Symbol(`${relative(__dirname, filename)}:${name}`);


class ContextImpl implements Context {
  private readonly _dependencyCreatorMap = new Map<Token<unknown>, ContextFunction<unknown>>();
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
  public async resolveAllAsync<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): ResolveAllAsyncResult<T> {
    return Promise.all(this.resolveAll(...tokens)) as ResolveAllAsyncResult<T>;
  }

  public registerDependency<T>(token: Token<T>, creator: ContextFunction<T>): void {
    if (this._dependencyCreatorMap.has(token)) {
      throw new Error(`Token already exists: ${String(token)}`);
    }
    this._dependencyCreatorMap.set(token, creator);
  }

  public registerSingletonDependency<T>(token: Token<T>, creator: ContextFunction<T>): void {
    const empty = Symbol('empty');
    let value: T | typeof empty = empty;
    this.registerDependency(token, (ctx) => {
      if (value === empty) {
        value = creator(ctx);
      }
      return value;
    });
  }
}

export const createContext = (): Context => new ContextImpl();


export const createSingletonDependencyRegistrant =
  <T>(token: Token<T>, creator: ContextFunction<T>): ContextFunction =>
    (ctx) => {
      ctx.registerSingletonDependency(token, creator);
    };
