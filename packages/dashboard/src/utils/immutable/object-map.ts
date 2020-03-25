interface ObjectMap<T> extends Record<PropertyKey, T> {}

interface ReadonlyObjectMap<T> extends Readonly<Record<PropertyKey, T>> {}

export interface MergeObjectMap {
  <T>(
    target: ReadonlyObjectMap<T> | null | undefined,
    source: ReadonlyObjectMap<T>,
    mapper?: (targetItem: T | undefined, sourceItem: T) => T
  ): ReadonlyObjectMap<T>;
}

export const mergeObjectMap: MergeObjectMap = <T>(
  target: ReadonlyObjectMap<T> | undefined | null,
  source: ReadonlyObjectMap<T>,
  mapper?: (targetItem: T | undefined, sourceItem: T) => T
): ReadonlyObjectMap<T> => {
  const mergeItem = mapper ?? ((_, sourceItem) => sourceItem);

  if (target === source) {
    return target;
  }

  if (target === null || target === undefined) {
    return Object.fromEntries(Reflect.ownKeys(source)
      .map((k) => [k, mergeItem(undefined, source[k as any])]));
  }

  const targetKeys = Reflect.ownKeys(target);
  const sourceKeys = Reflect.ownKeys(source);
  let result: ObjectMap<T> | undefined;
  if (targetKeys.length !== sourceKeys.length) {
    result = Object.fromEntries(sourceKeys
      .map((k) => [k, target[k as any]]));
  }
  for (const key of sourceKeys) {
    const targetItem = target[key as any];
    const sourceItem = source[key as any];
    if (sourceItem !== undefined && targetItem !== sourceItem) {
      const resultItem = mergeItem(targetItem, sourceItem);
      if (resultItem !== undefined && targetItem !== resultItem) {
        if (result === undefined) {
          result = Object.fromEntries(sourceKeys
            .map((k) => [k, target[k as any]]));
        }
        result[key as any] = resultItem;
      }
    }
  }
  return result === undefined ? target : result;
};
