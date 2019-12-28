export interface AppContext {
  resolve<T>(token: TokenOrCreator<T>): T;
  resolveAll<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): ResolveAllResult<T>;
  // eslint-disable-next-line max-len
  resolveAllAsync<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): ResolveAllAsyncResult<T>;
  registerSingleton<T>(token: TokenOrCreator<T>, creator: DependencyCreator<T>): void
}

export interface Token<T> extends Symbol {}

export type TokenOrCreator<T> = Token<T> | DependencyCreator<T>;

export interface DependencyCreator<T, A extends ReadonlyArray<any> = []> {
  (appCtx: AppContext, ...args: A): T;
}

export type ResolveAllResult<T extends ReadonlyArray<TokenOrCreator<any>>> = {
  -readonly [K in keyof T]: T[K] extends TokenOrCreator<infer U> ? U : never;
};

export type ResolveAllAsyncResult<T extends ReadonlyArray<TokenOrCreator<any>>> = Promise<{
  // eslint-disable-next-line max-len
  -readonly [K in keyof T]: T[K] extends TokenOrCreator<infer U> ? U extends PromiseLike<infer V> ? V : U : never;
}>;


export const createToken = <T>(mod: NodeModule, name: string): Token<T> =>
  Symbol(`${mod.filename}.${name}`);


export interface DependencyRegistrant<A extends ReadonlyArray<any> = []> {
  (appCtx: AppContext, ...args: A): void;
}

export const createSingletonDependencyRegistrant = <T, A extends ReadonlyArray<any>>(
  token: Token<T>,
  creator: DependencyCreator<T, A>
): DependencyRegistrant<A> => {
  const register: DependencyRegistrant<A> = (appCtx, ...args) => appCtx.registerSingleton(
    token,
    (c) => creator(c, ...args)
  );
  return register;
};
