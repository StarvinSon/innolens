import { Resolver, Resolvable } from '@innolens/resolver';


const injectableKeysSym = Symbol('injectableKeys');
const propertyDependencySym = Symbol('propertyDependency');

export const injectableProperty = (resolvable: Resolvable): PropertyDecorator =>
  (prototype, propertyKey) => {
    let keys: Array<PropertyKey> | undefined = Reflect.getOwnMetadata(injectableKeysSym, prototype);
    if (keys === undefined) {
      keys = [];
      Reflect.defineMetadata(injectableKeysSym, keys, prototype);
      for (
        let target = Reflect.getPrototypeOf(prototype);
        target !== null;
        target = Reflect.getPrototypeOf(target)
      ) {
        const parentKeys: ReadonlyArray<PropertyKey> | undefined =
          Reflect.getOwnMetadata(injectableKeysSym, target);
        if (parentKeys !== undefined) {
          for (const parentKey of parentKeys) {
            if (!keys.includes(parentKey)) {
              keys.push(parentKey);
            }
          }
          break;
        }
      }
    }

    if (!keys.includes(propertyKey)) {
      keys.push(propertyKey);
    }
    Reflect.defineMetadata(propertyDependencySym, resolvable, prototype, propertyKey);
  };

const getOwnInjectableKeys = (prototype: object): ReadonlyArray<string> | undefined =>
  Reflect.getOwnMetadata(injectableKeysSym, prototype);

const getOwnPropertyDependency = (prototype: object, key: PropertyKey): Resolvable | undefined =>
  Reflect.getOwnMetadata(
    propertyDependencySym,
    prototype,
    typeof key === 'number' ? String(key) : key
  );

const getPropertyDependencies =
  (prototype: object | null): Readonly<Record<PropertyKey, Resolvable>> | undefined => {
    if (prototype === null) {
      return undefined;
    }

    const baseDeps = getPropertyDependencies(Reflect.getPrototypeOf(prototype));

    const ownKeys = getOwnInjectableKeys(prototype);
    if (ownKeys === undefined || ownKeys.length === 0) {
      return baseDeps;
    }

    const ownDepEntries = ownKeys
      .map((key): [PropertyKey, Resolvable | undefined] =>
        [key, getOwnPropertyDependency(prototype, key)])
      .filter((entry): entry is [PropertyKey, Resolvable] => entry[1] !== undefined);
    if (ownDepEntries.length === 0) {
      return baseDeps;
    }

    return {
      ...baseDeps,
      ...Object.fromEntries(ownDepEntries)
    };
  };


const injectingInfos: WeakMap<object, readonly [Resolver, Promise<void>]> = new WeakMap();
const injectedTargets: WeakSet<object> = new WeakSet();

export const injectProperties = async (target: object, resolver: Resolver): Promise<void> => {
  if (injectedTargets.has(target)) {
    return;
  }

  const injectingInfo = injectingInfos.get(target);
  if (injectingInfo !== undefined) {
    const [injectingResolver, injectingPromise] = injectingInfo;
    if (injectingResolver !== resolver) {
      throw new Error('Cannot inject target because it is being injecting by another resolver');
    }
    await injectingPromise;
    return;
  }

  const deps = getPropertyDependencies(target);
  if (deps === undefined) {
    return;
  }

  const promise = Promise.resolve().then(async () => {
    const resolvedDepMap = await resolver.resolve(deps);
    for (const [key, resolvedDep] of Object.entries(resolvedDepMap)) {
      (target as any)[key] = resolvedDep;
    }
    injectedTargets.add(target);
  });

  injectingInfos.set(target, [resolver, promise]);
  try {
    await promise;
  } finally {
    injectingInfos.delete(target);
  }
};
