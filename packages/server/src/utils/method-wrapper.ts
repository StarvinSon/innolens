export interface Method extends Function {}


export interface MethodWrapper {
  (method: Method, target: object, propertyKey: PropertyKey): Method;
}

export const wrapMethod =
  (wrapper: MethodWrapper): MethodDecorator =>
    (target, propertyKey, descriptor) => {
      const newMethod = wrapper(descriptor.value as any, target, propertyKey);
      return {
        ...descriptor,
        value: newMethod as any
      };
    };


export interface WrapMethodFactory<A extends ReadonlyArray<any>> {
  (wrapper: MethodWrapper): MethodDecorator;
  initialize(
    constructor: new (...args: ReadonlyArray<any>) => any,
    $this: object,
    ...args: A
  ): void;
}


export interface MethodFactoryWrapper<I extends ReadonlyArray<any>> {
  (method: Method, prototype: object, propertyKey: PropertyKey): MethodFactory<I>;
}

export interface MethodFactory<I extends ReadonlyArray<any>> {
  ($this: object, ...initArgs: I): Method;
}

export interface MethodInitializer<I extends ReadonlyArray<any>> {
  ($this: object, ...initArgs: I): void;
}

export const wrapMethodFactory =
  <I extends ReadonlyArray<unknown>>(
    name: string,
    initializersSym: symbol,
    factoryWrapper: MethodFactoryWrapper<I>
  ): MethodDecorator =>
    wrapMethod((baseMethod, prototype, propertyKey) => {
      const factory = factoryWrapper(baseMethod, prototype, propertyKey);

      let initializers: Array<MethodInitializer<I>> | undefined =
        Reflect.getOwnMetadata(initializersSym, prototype);
      if (initializers === undefined) {
        initializers = [];
        Reflect.defineMetadata(initializersSym, initializers, prototype);
      }

      const methodSym = Symbol(`${String(propertyKey)}$method`);

      initializers.push(($this, ...initArgs) => {
        const newMethod = factory($this, ...initArgs);
        Reflect.defineMetadata(methodSym, newMethod, $this, propertyKey as any);
      });

      const invokeMethod = function(this: object, ...methArgs: ReadonlyArray<any>): any {
        const newMethod = Reflect.getMetadata(methodSym, this, propertyKey as any);
        if (newMethod === undefined) {
          throw new Error(`${name} is applied to method ${String(propertyKey)}, but it has not been initialized`);
        }
        return Reflect.apply(newMethod, this, methArgs);
      };
      return invokeMethod;
    });

export const createMethodInitializer =
  <I extends ReadonlyArray<unknown>>(name: string, initializersSym: symbol) =>
    <T extends object>(
      constructor: new (...args: ReadonlyArray<any>) => T,
      $this: T,
      ...initArgs: I
    ): void => {
      const initializers: ReadonlyArray<MethodFactory<I>> | undefined =
        Reflect.getOwnMetadata(initializersSym, constructor.prototype);
      if (initializers === undefined) {
        throw new Error(`${name} does not need to be initialized in class ${constructor.name}`);
      }
      for (const initializer of initializers) {
        initializer($this, ...initArgs);
      }
    };
