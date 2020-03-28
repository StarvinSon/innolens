export interface MergeArray {
  <T>(
    target: ReadonlyArray<T> | null | undefined,
    source: ReadonlyArray<T>,
    mapper: (targetItem: T | undefined, sourceItem: T) => T
  ): ReadonlyArray<T>;
}

export const mergeArray: MergeArray = <T>(
  target: ReadonlyArray<T> | null | undefined,
  source: ReadonlyArray<T>,
  mapper: (tarElem: T | undefined, srcElem: T) => T
): ReadonlyArray<T> => {
  if (target === source) {
    return target;
  }

  if (target === undefined || target === null) {
    return source.map((sourceItem) => mapper(undefined, sourceItem));
  }

  let result: Array<any> | undefined;
  if (target.length !== source.length) {
    result = source.map((_, i) => target[i]);
  }
  for (let i = 0; i < source.length; i += 1) {
    const targetItem = target[i];
    const sourceItem = source[i];
    if (sourceItem !== undefined && targetItem !== sourceItem) {
      const resultItem = mapper(targetItem, sourceItem);
      if (resultItem !== undefined && targetItem !== resultItem) {
        if (result === undefined) {
          result = source.map((_, j) => target[j]);
        }
        result[i] = resultItem;
      }
    }
  }
  return result === undefined ? target : result;
};
