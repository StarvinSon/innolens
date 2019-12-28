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
