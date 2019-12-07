import { InjectionToken } from 'tsyringe';


export interface AppContext {
  resolve<T>(token: InjectionToken<T>): T;
  resolveAll<T extends ReadonlyArray<InjectionToken<any>>>(...tokens: T): ResolveAllResult<T>;
  // eslint-disable-next-line max-len
  resolveAllAsync<T extends ReadonlyArray<InjectionToken<any>>>(...tokens: T): ResolveAllAsyncResult<T>;
  registerSingleton<T>(token: InjectionToken<T>, creator: DependencyCreator<T>): void
}

export type ResolveAllResult<T extends ReadonlyArray<InjectionToken<any>>> = {
  -readonly [K in keyof T]: T[K] extends InjectionToken<infer U> ? U : never;
};

export type ResolveAllAsyncResult<T extends ReadonlyArray<InjectionToken<any>>> = Promise<{
  // eslint-disable-next-line max-len
  -readonly [K in keyof T]: T[K] extends InjectionToken<infer U> ? U extends PromiseLike<infer V> ? V : U : never;
}>;

export interface DependencyCreator<T, U extends ReadonlyArray<any> = []> {
  (appCtx: AppContext, ...args: U): T;
}


export const createToken = <T>(mod: NodeModule, name: string): InjectionToken<T> =>
  Symbol(`${mod.filename}.${name}`);


export interface DependencyRegistrant<T extends ReadonlyArray<any> = []> {
  (appCtx: AppContext, ...args: T): void;
}

export const createSingletonDependencyRegistrant = <T, U extends ReadonlyArray<any> = []>(
  token: InjectionToken<T>,
  creator: DependencyCreator<T, U>
): DependencyRegistrant<U> => {
  const register: DependencyRegistrant<U> = (appCtx, ...args) => appCtx.registerSingleton(
    token,
    (ctx) => creator(ctx, ...args)
  );
  return register;
};
