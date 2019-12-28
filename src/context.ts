// Prevent eslint import/no-cycle error
type AnyAction = import('./state').AnyAction;
type State = import('./state').State;


export class StateChangedEvent extends Event {
  public constructor() {
    super('state-changed');
  }
}

export interface Context extends EventTarget {
  readonly state: State;
  dispatchAction<T extends AnyAction>(action: T): T;
  resolve<T>(token: TokenOrCreator<T>): T;
  resolveAll<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): ResolveAllResult<T>;
  // eslint-disable-next-line max-len
  resolveAllAsync<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): ResolveAllAsyncResult<T>;
  registerSingleton<T>(token: Token<T>, creator: DependencyCreator<T>): void
}

export interface Token<T> extends Symbol {}

export type TokenOrCreator<T> = Token<T> | DependencyCreator<T>;

export interface DependencyCreator<T, U extends ReadonlyArray<any> = []> {
  (ctx: Context, ...args: U): T;
}

export type ResolveAllResult<T extends ReadonlyArray<TokenOrCreator<any>>> = {
  -readonly [K in keyof T]: T[K] extends TokenOrCreator<infer U> ? U : never;
};

export type ResolveAllAsyncResult<T extends ReadonlyArray<TokenOrCreator<any>>> = Promise<{
  // eslint-disable-next-line max-len
  -readonly [K in keyof T]: T[K] extends TokenOrCreator<infer U> ? U extends PromiseLike<infer V> ? V : U : never;
}>;


export const createToken = <T>(moduleId: string, name: string): Token<T> =>
  Symbol(`${moduleId}.${name}`);


export interface DependencyRegistrant<T extends ReadonlyArray<any> = []> {
  (ctx: Context, ...args: T): void;
}

export const createSingletonDependencyRegistrant = <T, U extends ReadonlyArray<any> = []>(
  token: Token<T>,
  creator: DependencyCreator<T, U>
): DependencyRegistrant<U> => {
  const register: DependencyRegistrant<U> = (ctx, ...args) => ctx.registerSingleton(
    token,
    (c) => creator(c, ...args)
  );
  return register;
};
