export interface PropertyAccessor<T> {
  get?(target: object): T;
  set?(target: object, val: T): void;
}

export interface PropertyWrapper<T> {
  (
    superAccessor: PropertyAccessor<T>,
    prototype: object,
    propertyKey: PropertyKey
  ): PropertyAccessor<T>;
}

export const wrapProperty = <T>(wrapper: PropertyWrapper<T>): PropertyDecorator =>
  (prototype, propertyKey) => {
    let superAccessor: PropertyAccessor<T>;

    const descriptor = Reflect.getOwnPropertyDescriptor(prototype, propertyKey);
    if (descriptor === undefined || 'value' in descriptor) {
      const sym = Symbol(String(propertyKey));
      const writable = descriptor?.writable ?? true;
      Reflect.defineProperty(prototype, sym, {
        configurable: true,
        enumerable: false,
        value: descriptor?.value,
        writable
      });
      superAccessor = {
        get: (target) => (target as any)[sym],
        set: writable
          ? (target, val) => void ((target as any)[sym] = val)
          : undefined
      };

    } else {
      const getSuper = descriptor.get;
      const setSuper = descriptor.set;
      superAccessor = {
        get: getSuper === undefined
          ? undefined
          : (target) => Reflect.apply(getSuper, target, []),
        set: setSuper === undefined
          ? undefined
          : (target, val) => void Reflect.apply(setSuper, target, [val])
      };
    }

    const { get: getOwn, set: setOwn } = wrapper(superAccessor, prototype, propertyKey);
    Reflect.defineProperty(prototype, propertyKey, {
      configurable: true,
      enumerable: descriptor?.enumerable ?? true,
      get: getOwn === undefined ? undefined : function get(this: object) {
        return getOwn(this);
      },
      set: setOwn === undefined ? undefined : function set(this: object, val: T) {
        setOwn(this, val);
      }
    });
  };
