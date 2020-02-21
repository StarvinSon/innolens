const getOwnPropertyValue = <T extends object, K extends keyof T>(
  obj: T,
  key: K
): T[K] | undefined => {
  const descriptor = Reflect.getOwnPropertyDescriptor(obj, key);
  if (descriptor !== undefined) {
    if ('value' in descriptor) {
      return descriptor.value;
    }
    if ('get' in descriptor) {
      return Reflect.apply(descriptor.get!, obj, []);
    }
  }
  return undefined;
};


export interface MergeObject {
  <T extends object>(target: T | undefined | null, source: T): T;
  <T extends object>(target: T, source: Partial<T>): T;
}

export const mergeObject: MergeObject = <T extends object>(
  target: T | undefined | null,
  source: T | null
) => {
  if (target === source) {
    return target;
  }

  if (target === undefined || target === null) {
    return source === null ? null : { ...source };
  }

  if (source === null) {
    return null;
  }

  const keys = new Set([
    ...Reflect.ownKeys(target),
    ...Reflect.ownKeys(source)
  ]) as unknown as ReadonlySet<keyof T>;

  let result: T | null | undefined;
  for (const key of keys) {
    const targetVal = getOwnPropertyValue(target, key);
    const sourceVal = getOwnPropertyValue(source, key);
    if (sourceVal !== undefined && targetVal !== sourceVal) {
      if (result === undefined) {
        result = { ...target };
      }
      (result as any)[key] = sourceVal;
    }
  }

  return result === undefined ? target : result;
};
