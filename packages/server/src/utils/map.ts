export type Map2<T, U, V> = Map<T, Map<U, V>>;

export type ReadonlyMap2<T, U, V> = ReadonlyMap<T, ReadonlyMap<U, V>>;

export const getMap2 = <T, U, V>(
  map: ReadonlyMap2<T, U, V>,
  key1: T,
  key2: U
): V | undefined => {
  const subMap = map.get(key1);
  if (subMap === undefined) return undefined;
  return subMap.get(key2);
};

export const setMap2 = <T, U, V>(map: Map2<T, U, V>, key1: T, key2: U, val: V): void => {
  let subMap = map.get(key1);
  if (subMap === undefined) {
    subMap = new Map();
    map.set(key1, subMap);
  }
  subMap.set(key2, val);
};

export const copyMap2 = <T, U, V>(map: ReadonlyMap2<T, U, V>): Map2<T, U, V> =>
  new Map(Array.from(map).map(([key, subMap]) => [key, new Map(subMap)]));

export const filterMap2 = <T, U, V>(
  map: ReadonlyMap2<T, U, V>,
  func: (val: V) => boolean
): Map2<T, U, V> => {
  const result: Map2<T, U, V> = new Map();
  for (const [key1, subMap] of map) {
    const resultSubMap = new Map<U, V>();
    for (const [key2, val] of subMap) {
      if (func(val)) {
        resultSubMap.set(key2, val);
      }
    }
    if (resultSubMap.size > 0) {
      result.set(key1, resultSubMap);
    }
  }
  return result;
};
