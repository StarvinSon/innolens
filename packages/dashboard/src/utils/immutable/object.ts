export interface MergeObject {
  <T extends object>(
    target: T | undefined | null,
    source: T,
    mergeValue?: (
      targetVal: T[keyof T] | undefined,
      sourceVal: T[keyof T],
      key: keyof T
    ) => T[keyof T]
  ): T;
  <T extends object>(
    target: T,
    source: Partial<T>,
    mergeValue?: (
      targetVal: T[keyof T] | undefined,
      sourceVal: T[keyof T],
      key: keyof T
    ) => T[keyof T]
  ): T;
}

export const mergeObject: MergeObject = <T extends object>(
  target: T | undefined | null,
  source: T | null,
  mergeValue?: (
    targetVal: T[keyof T] | undefined,
    sourceVal: T[keyof T],
    key: keyof T
  ) => T[keyof T]
) => {
  if (target === source) {
    return target;
  }

  if (target === undefined || target === null) {
    if (source === null) {
      return null;
    }
    if (mergeValue === undefined) {
      return { ...source };
    }
    return Object.fromEntries((Reflect.ownKeys(source) as Array<keyof T>)
      .map((key) => [key, mergeValue(undefined, source[key], key)]));
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
    const targetVal = target[key];
    const sourceVal = source[key];
    if (sourceVal !== undefined && targetVal !== sourceVal) {
      const resultVal = mergeValue === undefined
        ? sourceVal
        : mergeValue(targetVal, sourceVal, key);
      if (resultVal !== undefined && targetVal !== resultVal) {
        if (result === undefined) {
          result = { ...target };
        }
        (result as any)[key] = sourceVal;
      }
    }
  }

  return result === undefined ? target : result;
};
