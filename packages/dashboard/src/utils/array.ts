export const toggleArray = <T>(array: ReadonlyArray<T>, item: T): ReadonlyArray<T> => {
  const index = array.indexOf(item);
  if (index >= 0) {
    return [...array.slice(0, index), ...array.slice(index + 1)];
  }
  return [...array, item];
};

export const toggleNullableArray = <T>(
  array: ReadonlyArray<T> | null,
  item: T
): ReadonlyArray<T> | null => {
  if (array === null) return [item];
  if (array.length === 1 && array[0] === item) return null;

  const index = array.indexOf(item);
  if (index >= 0) {
    return [...array.slice(0, index), ...array.slice(index + 1)];
  }
  return [...array, item];
};
