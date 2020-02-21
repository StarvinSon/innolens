/// <reference types="reflect-metadata" />


export class ResolveError extends Error {
  public constructor(
    resolvingNames: ReadonlyArray<string>,
    public readonly cause: Error
  ) {
    super(`Error during resolving: ${resolvingNames.join(' > ')}`);
    Error.captureStackTrace?.(this, ResolveError);
    this.stack += `\n--- The above is caused by ---\n${cause.stack}`;
  }
}


declare const __type__: unique symbol;
export interface Token<T> extends Symbol {
  readonly [__type__]: T;
}

export const createToken = <T>(name: string): Token<T> =>
  Symbol(name) as unknown as Token<T>;

export const isToken = (val: unknown): val is Token<unknown> =>
  typeof val === 'symbol';


export interface FunctionDecorator {
  <F extends Function>(target: F): F | void;
}


export interface Decorate {
  <T extends Function>(
    func: T
  ): T;
  <T extends Function>(
    d0: FunctionDecorator,
    func: T
  ): T;
  <T extends Function>(
    d0: FunctionDecorator,
    d1: FunctionDecorator,
    func: T
  ): T;
  <T extends Function>(
    d0: FunctionDecorator,
    d1: FunctionDecorator,
    d2: FunctionDecorator,
    func: T
  ): T;
  <T extends Function>(
    d0: FunctionDecorator,
    d1: FunctionDecorator,
    d2: FunctionDecorator,
    d3: FunctionDecorator,
    func: T
  ): T;
  <T extends Function>(
    d0: FunctionDecorator,
    d1: FunctionDecorator,
    d2: FunctionDecorator,
    d3: FunctionDecorator,
    d4: FunctionDecorator,
    func: T
  ): T;
  <T extends Function>(
    d0: FunctionDecorator,
    d1: FunctionDecorator,
    d2: FunctionDecorator,
    d3: FunctionDecorator,
    d4: FunctionDecorator,
    d5: FunctionDecorator,
    func: T
  ): T;
  <T extends Function>(
    ...dsOrFunc: ReadonlyArray<FunctionDecorator | T>
  ): T;
}

export const decorate: Decorate = (...args: ReadonlyArray<any>) =>
  args.reduceRight((r, f) => {
    const g = f(r);
    return g === undefined ? r : g;
  });

export const combineDecorators = (...decs: ReadonlyArray<FunctionDecorator>): FunctionDecorator =>
  (target) => decorate(
    ...decs,
    target
  );


const KEY_DEPENDENCY = 'resolve:dependency';
const KEY_FUNCTION_TYPE = 'resolve:functionType';

const FUNCTION_TYPE_CONSTRUCTOR = 'CONSTRUCTOR';
const FUNCTION_TYPE_FACTORY = 'FACTORY';

export const injectableConstructor = (...resolvable: ReadonlyArray<Resolvable>): ClassDecorator =>
  combineDecorators(
    Reflect.metadata(KEY_DEPENDENCY, resolvable),
    Reflect.metadata(KEY_FUNCTION_TYPE, FUNCTION_TYPE_CONSTRUCTOR)
  );

export const injectableFactory = (...resolvable: ReadonlyArray<Resolvable>): FunctionDecorator =>
  combineDecorators(
    Reflect.metadata(KEY_DEPENDENCY, resolvable),
    Reflect.metadata(KEY_FUNCTION_TYPE, FUNCTION_TYPE_FACTORY)
  );

const getDependencies = (func: object): ReadonlyArray<Resolvable> | undefined =>
  Reflect.getMetadata(KEY_DEPENDENCY, func);

const getFunctionType = (func: object): string | undefined =>
  Reflect.getMetadata(KEY_FUNCTION_TYPE, func);


const KEY_SINGLETON = 'resolve:singleton';

export const singleton = (): FunctionDecorator =>
  Reflect.metadata(KEY_SINGLETON, true);

const isSingleton = (func: Function): boolean =>
  Reflect.getMetadata(KEY_SINGLETON, func) === true;


export const map =
  <R extends Resolvable, M extends (r: Resolve<R>) => any>(
    resolvable: R,
    mapper: M
  ): M =>
    decorate(
      injectableFactory(resolvable),
      mapper
    );


export const name = (n: string): FunctionDecorator => (func: Function) => {
  Reflect.defineProperty(func, 'name', {
    configurable: true,
    enumerable: false,
    value: n,
    writable: false
  });
};


export interface Resolver {
  resolve<T extends Resolvable>(resolvable: T): Promise<Resolve<T>>;
  register<T>(token: Token<T>, FactoryOrCtr: FactoryOrConstructor<T>): void
}

export const Resolver = createToken<Resolver>('Resolver');

export type Resolvable =
  Token<any> | FactoryOrConstructor<any> | ResolvableArray | ResolvableMap;

export type FactoryOrConstructor<T> = Factory<T> | Constructor<T>;

export interface Factory<T> {
  (...args: Array<any>): T;
}

export interface Constructor<T> {
  new (...args: Array<any>): T;
}

export interface ResolvableArray extends ReadonlyArray<Resolvable> {}

export interface ResolvableMap extends Readonly<Record<PropertyKey, Resolvable>> {}


export type Resolve<T extends Resolvable> =
  T extends Token<any> ? ResolveToken<T>
    : T extends FactoryOrConstructor<any> ? ResolveFactoryOrConstructor<T>
      : T extends ResolvableArray | ResolvableMap ? ResolveArrayOrMap<T>
        : never;

export type ResolveToken<T extends Token<any>> =
  T extends Token<infer U> ? U : never;

export type ResolveFactoryOrConstructor<T extends FactoryOrConstructor<any>> =
  T extends Factory<infer U> ? ResolvePromise<U>
    : T extends Constructor<infer U> ? ResolvePromise<U>
      : never;

export type ResolvePromise<T> = T extends PromiseLike<infer U> ? U : T;

export type ResolveArrayOrMap<T extends ResolvableArray | ResolvableMap> =
  { -readonly [K in keyof T]: T[K] extends Resolvable ? Resolve<T[K]> : never; };


class ResolverImpl implements Resolver {
  private readonly _factoryOrCtrMap = new Map<Token<unknown>, FactoryOrConstructor<unknown>>();
  private readonly _singletonMap = new WeakMap<FactoryOrConstructor<unknown>, unknown>();

  // eslint-disable-next-line max-len
  private readonly _resolvingSingletonPromises: Map<FactoryOrConstructor<unknown>, Promise<unknown>> = new Map();

  public constructor() {
    this.register(Resolver, decorate(
      injectableFactory(),
      singleton(),
      (): Resolver => this
    ));
  }

  public async resolve<T extends Resolvable>(resolvable: T): Promise<Resolve<T>> {
    return this._resolveInternal(resolvable, new Set(), []);
  }

  public async _resolveInternal<T extends Resolvable>(
    resolvable: T,
    resolvingObjs: Set<object>,
    resolvingNames: Array<string>
  ): Promise<Resolve<T>> {
    let resolvableName: string;
    let doResolve: (
      recursiveResolve: <T extends Resolvable>(r: T) => Promise<Resolve<T>>
    ) => Promise<any>;

    if (Array.isArray(resolvable)) {
      const resolvableArray = resolvable as ResolvableArray;
      resolvableName = Object.prototype.toString.call(resolvable);
      doResolve = async (recursiveResolve) => Promise.all(resolvableArray.map(recursiveResolve));

    } else if (typeof resolvable === 'object') {
      const resolvableMap = resolvable as ResolvableMap;
      resolvableName = Object.prototype.toString.call(resolvable);
      doResolve = async (recursiveResolve) => {
        const entryPromises = Object
          .entries(resolvableMap)
          .map(async ([key, someSubToken]): Promise<[PropertyKey, unknown]> =>
            [key, await recursiveResolve(someSubToken)]);
        return Object.fromEntries(await Promise.all(entryPromises));
      };

    } else if (isToken(resolvable)) {
      const token = resolvable;
      if (!this._factoryOrCtrMap.has(token)) {
        throw new Error(`Missing dependency for ${String(token)}`);
      }
      const factoryOrCtr = this._factoryOrCtrMap.get(token)!;
      resolvableName = String(token);
      doResolve = async (recursiveResolve) => recursiveResolve(factoryOrCtr);

    } else if (typeof resolvable === 'function') {
      const factoryOrCtr = resolvable as FactoryOrConstructor<unknown>;
      resolvableName = factoryOrCtr.name;
      doResolve = async (recursiveResolve) => {
        const single = isSingleton(factoryOrCtr);

        if (single && this._singletonMap.has(factoryOrCtr)) {
          return this._singletonMap.get(factoryOrCtr);
        }

        if (single && this._resolvingSingletonPromises.has(factoryOrCtr)) {
          return this._resolvingSingletonPromises.get(factoryOrCtr);
        }

        const resultPromise = Promise.resolve().then(async () => {
          const deps = getDependencies(factoryOrCtr) ?? [];
          const resolvedDeps = await recursiveResolve(deps);

          const functionType = getFunctionType(factoryOrCtr);
          switch (functionType) {
            case FUNCTION_TYPE_FACTORY: {
              const factory = factoryOrCtr as Factory<unknown>;
              return factory(...resolvedDeps);
            }
            case FUNCTION_TYPE_CONSTRUCTOR: {
              const constructor = factoryOrCtr as Constructor<unknown>;
              return new constructor(...resolvedDeps);
            }
            case undefined: {
              throw new Error('Function is not injectable. Make sure it is decorated with @injectFactory() or @injectConstructor()');
            }
            default: {
              throw new Error(`Unknown function type: ${functionType}`);
            }
          }
        });

        let result: unknown;
        if (single) {
          this._resolvingSingletonPromises.set(factoryOrCtr, resultPromise);
        }
        try {
          result = await resultPromise;
        } catch (err) {
          throw err instanceof ResolveError
            ? err
            : new ResolveError(resolvingNames, err);
        } finally {
          if (single) {
            this._resolvingSingletonPromises.delete(factoryOrCtr);
          }
        }
        if (single) {
          this._singletonMap.set(factoryOrCtr, result);
        }
        return result;
      };

    } else {
      throw new TypeError(`Unresolvable type ${Object.prototype.toString.call(resolvable)}`);
    }

    if (resolvingObjs.has(resolvable)) {
      throw new Error(
        `Circular dependency: ${[...resolvingNames, resolvableName].join(' > ')}`
      );
    }
    return doResolve(async (subResolvable) => this._resolveInternal(
      subResolvable,
      new Set(resolvingObjs).add(resolvable),
      [...resolvingNames, resolvableName]
    ));
  }

  public register<T>(token: Token<T>, factoryOrCtr: FactoryOrConstructor<T>): void {
    if (this._factoryOrCtrMap.has(token)) {
      throw new Error(`Token already exists: ${String(token)}`);
    }
    this._factoryOrCtrMap.set(token, factoryOrCtr);
  }
}

export const createResolver = (): Resolver => new ResolverImpl();
