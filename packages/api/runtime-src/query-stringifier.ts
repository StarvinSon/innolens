import { formatISO } from 'date-fns';


export const encodeQueryNull = (val: unknown): string | undefined =>
  val === null ? JSON.stringify(val) : undefined;

export const encodeQueryBoolean = (val: unknown): string | undefined =>
  typeof val === 'boolean' ? JSON.stringify(val) : undefined;

export const encodeQueryInteger = (val: unknown): string | undefined => {
  if (typeof val === 'number' && Number.isInteger(val)) {
    return JSON.stringify(val);
  }
  return undefined;
};

export const encodeQueryNumber = (val: unknown): string | undefined =>
  typeof val === 'number' ? JSON.stringify(val) : undefined;

export const encodeQueryString = (val: unknown): string | undefined =>
  typeof val === 'string' ? val : undefined;

export const encodeQueryDate = (val: unknown): string | undefined =>
  val instanceof Date ? formatISO(val) : undefined;

export const encodeQueryArray = (
  val: ReadonlyArray<unknown>,
  itemEncoder: (item: unknown) => string | undefined
): string | undefined => {
  if (!Array.isArray(val)) return undefined;

  const encodedItems: Array<string> = [];
  for (const item of val) {
    const encodedItem = itemEncoder(item);
    if (encodedItem === undefined) return undefined;
    encodedItems.push(encodeURIComponent(encodedItem));
  }
  return encodedItems.join(',');
};
