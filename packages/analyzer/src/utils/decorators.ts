export const autoBind = (): MethodDecorator => (target, propertyKey, descriptor) => {
  const getMethod = (receiver: object): Function => {
    const method = ('get' in descriptor
      ? Reflect.apply(descriptor.get!, receiver, [])
      : descriptor.value) as Function;
    return method.bind(receiver);
  };
  return {
    configurable: true,
    enumerable: false,
    get(this: object) {
      Reflect.defineProperty(this, propertyKey, {
        configurable: true,
        enumerable: false,
        value: getMethod(this),
        writable: true
      });
      return (this as any)[propertyKey];
    }
  };
};


export interface Observer<T, U> {
  (this: T, newVal: U, oldVal: U | undefined): void
}

// eslint-disable-next-line max-len
export const onChanged = <T, U>(observer: Observer<T, U>): PropertyDecorator => (target, propertyKey) => {
  const descriptor = Reflect.getOwnPropertyDescriptor(target, propertyKey);
  let getVal: (receiver: T) => U | undefined;
  let setVal: (receiver: T, newVal: U) => void;
  if (descriptor === undefined || 'value' in descriptor) {
    const key = Symbol(String(propertyKey));
    Reflect.defineProperty(target, key, {
      configurable: true,
      enumerable: false,
      value: descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined,
      writable: true
    });
    getVal = (receiver) => (receiver as any)[key];
    setVal = (receiver, newVal) => {
      // eslint-disable-next-line no-param-reassign
      (receiver as any)[key] = newVal;
    };
  } else {
    const getter = descriptor.get!;
    const setter = descriptor.set!;
    getVal = (receiver) => Reflect.apply(getter, receiver, []);
    setVal = (receiver, newVal) => {
      Reflect.apply(setter, receiver, [newVal]);
    };
  }

  Reflect.defineProperty(target, propertyKey, {
    configurable: true,
    enumerable: true,
    get(this: T) {
      return getVal(this);
    },
    set(this: T, newVal: U) {
      const oldVal = getVal(this);
      setVal(this, newVal);
      if (oldVal !== newVal) {
        Reflect.apply(observer, this, [newVal, oldVal]);
      }
    }
  });
};
