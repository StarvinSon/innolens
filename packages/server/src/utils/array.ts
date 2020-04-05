export const fromAsync = async <T>(iterable: Iterable<T> | AsyncIterable<T>): Promise<Array<T>> => {
  const result: Array<T> = [];
  for await (const item of iterable) {
    result.push(item);
  }
  return result;
};

export const contains = <T>(arr: ReadonlyArray<T>, val: unknown): val is T =>
  arr.includes(val as any);
