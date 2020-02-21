export const autoBind = (): MethodDecorator => (prototype, propertyKey, descriptor) => {
  const boundMethodMap = new WeakMap<object, Function>();

  const getBoundMethod = (receiver: object): Function => {
    let boundMethod = boundMethodMap.get(receiver);
    if (boundMethod !== undefined) {
      return boundMethod;
    }

    const method = ('get' in descriptor
      ? Reflect.apply(descriptor.get!, receiver, [])
      : descriptor.value) as Function;
    boundMethod = method.bind(receiver) as Function;
    boundMethodMap.set(receiver, boundMethod);
    return boundMethod;
  };

  return {
    configurable: true,
    enumerable: false,
    get(this: object): any {
      return getBoundMethod(this);
    }
  };
};
