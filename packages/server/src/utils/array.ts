export const fromAsync = async <T>(iterable: Iterable<T> | AsyncIterable<T>): Promise<Array<T>> => {
  const result: Array<T> = [];
  for await (const item of iterable) {
    result.push(item);
  }
  return result;
};
