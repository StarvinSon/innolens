export interface ReadonlyMap2<T, U, V> {
  get(key1: T, key2: U): V | undefined;
  values(): IterableIterator<V>;
  [Symbol.iterator](): IterableIterator<[T, U, V]>;
}

export class Map2<T, U, V> implements ReadonlyMap2<T, U, V> {
  private readonly _map: Map<T, Map<U, V>> = new Map();

  public constructor(map?: Iterable<readonly [T, U, V]>) {
    if (map !== undefined) {
      for (const [key1, key2, val] of map) {
        this.set(key1, key2, val);
      }
    }
  }

  public get(key1: T, key2: U): V | undefined {
    const subMap = this._map.get(key1);
    if (subMap === undefined) return undefined;
    return subMap.get(key2);
  }

  public set(key1: T, key2: U, val: V): void {
    let subMap = this._map.get(key1);
    if (subMap === undefined) {
      subMap = new Map();
      this._map.set(key1, subMap);
    }
    subMap.set(key2, val);
  }

  public *values(): IterableIterator<V> {
    for (const subMap of this._map.values()) {
      yield* subMap.values();
    }
  }

  public *[Symbol.iterator](): IterableIterator<[T, U, V]> {
    for (const [key1, subMap] of this._map) {
      for (const [key2, val] of subMap) {
        yield [key1, key2, val];
      }
    }
  }
}
