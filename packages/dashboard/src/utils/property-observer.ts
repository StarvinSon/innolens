import { wrapProperty } from './property-wrapper';


export interface Observer<T, U> {
  (this: T, newVal: U, oldVal: U | undefined): void;
}

export const observeProperty =
  <T extends object, U>(observer: PropertyKey | Observer<T, U>): PropertyDecorator =>
    wrapProperty((superAccessor) => {
      const { get: getSuper, set: setSuper } = superAccessor;
      if (getSuper === undefined || setSuper === undefined) {
        throw new Error('onChanged decorator can only be used on property both readable and writable');
      }

      return {
        get: getSuper,
        set: (target, newVal) => {
          const oldVal = getSuper(target);
          setSuper(target, newVal);
          if (oldVal !== newVal) {
            let method: Function;
            if (typeof observer === 'function') {
              method = observer;
            } else {
              method = (target as any)[observer];
              if (method === undefined) {
                throw new TypeError(`${Reflect.getPrototypeOf(target).constructor.name} has no method ${String(observer)}`);
              }
            }
            Reflect.apply(method, target, [newVal, oldVal]);
          }
        }
      };
    });
