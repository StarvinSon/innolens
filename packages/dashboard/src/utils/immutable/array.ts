export interface MigrateArray {
  <T>(
    target: ReadonlyArray<T> | undefined,
    source: ReadonlyArray<T>,
    map: (targetItem: T | undefined, sourceItem: T) => T
  ): ReadonlyArray<T>;
}

export const migrateArray: MigrateArray = <T>(
  target: ReadonlyArray<T> | undefined,
  source: ReadonlyArray<T>,
  map: (tarElem: T | undefined, srcElem: T) => T
): ReadonlyArray<T> => {
  let result: Array<any> | undefined;

  if (target === undefined) {
    result = source.map((sourceItem) => map(undefined, sourceItem));
  } else {
    if (target.length !== source.length) {
      result = source.map((_, i) => target[i]);
    }
    for (let i = 0; i < source.length; i += 1) {
      const targetItem = target[i];
      const sourceItem = source[i];
      if (sourceItem !== undefined) {
        const resultItem = map(targetItem, sourceItem);
        if (resultItem !== undefined && targetItem !== resultItem) {
          if (result === undefined) {
            result = source.map((_, j) => target[j]);
          }
          result[i] = resultItem;
        }
      }
    }
  }
  return result === undefined ? target! : result;
};
