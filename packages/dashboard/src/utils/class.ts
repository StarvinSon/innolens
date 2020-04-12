export const stringTag = (tag?: string): ClassDecorator => (cls) => {
  Reflect.defineProperty(cls.prototype, Symbol.toStringTag, {
    configurable: true,
    enumerable: false,
    value: tag ?? cls.name,
    writable: false
  });
  return cls;
};
