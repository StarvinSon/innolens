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
  val: unknown,
  // eslint-disable-next-line max-len
  itemEncoder: ((item: unknown) => string | undefined) | ReadonlyArray<(item: unknown) => string | undefined>
): string | undefined => {
  if (!Array.isArray(val)) return undefined;

  const encodedItems: Array<string> = [];

  if (Array.isArray(itemEncoder)) {
    for (let i = 0; i < itemEncoder.length; i += 1) {
      if (i >= val.length) return undefined;
      const encodedItem = itemEncoder[i](val[i]);
      if (encodedItem === undefined) return undefined;
      encodedItems.push(encodedItem);
    }
  } else {
    for (let i = 0; i < val.length; i += 1) {
      const encodedItem = (itemEncoder as (item: unknown) => string | undefined)(val[i]);
      if (encodedItem === undefined) return undefined;
      encodedItems.push(encodedItem);
    }
  }

  return encodedItems.map(encodeURIComponent).join(',');
};
