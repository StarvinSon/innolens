export const bindProxy = <T extends object>(obj: T): T => {
  const bindedFuncMap = new WeakMap<Function, Function>();

  return new Proxy(obj, {
    get(target, property) {
      const val = (target as any)[property];
      if (typeof val === 'function') {
        let bound = bindedFuncMap.get(val);
        if (bound === undefined) {
          bound = Function.prototype.bind.call(val, target) as Function;
          bindedFuncMap.set(val, bound);
        }
        return bound;
      }
      return val;
    }
  });
};
