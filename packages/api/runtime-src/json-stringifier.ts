import { formatISO } from 'date-fns';


export const encodeJsonNull = (val: unknown): null | undefined =>
  val === null ? null : undefined;

export const encodeJsonBoolean = (val: unknown): boolean | undefined =>
  typeof val === 'boolean' ? val : undefined;

export const encodeJsonInteger = (val: unknown): number | undefined => {
  if (typeof val === 'number' && Number.isInteger(val)) {
    return val;
  }
  return undefined;
};

export const encodeJsonNumber = (val: unknown): number | undefined =>
  typeof val === 'number' ? val : undefined;

export const encodeJsonString = (val: unknown): string | undefined =>
  typeof val === 'string' ? val : undefined;

export const encodeJsonDate = (val: unknown): string | undefined =>
  val instanceof Date ? formatISO(val) : undefined;

export const encodeJsonArray = (
  val: unknown,
  itemEncoder: ((item: unknown) => unknown) | ReadonlyArray<(item: unknown) => unknown>
): Array<unknown> | undefined => {
  if (!Array.isArray(val)) return undefined;

  const encodedItems: Array<unknown> = [];

  if (Array.isArray(itemEncoder)) {
    for (let i = 0; i < itemEncoder.length; i += 1) {
      if (i >= val.length) return undefined;
      const encodedItem = itemEncoder[i](val[i]);
      if (encodedItem === undefined) return undefined;
      encodedItems.push(encodedItem);
    }
  } else {
    for (let i = 0; i < val.length; i += 1) {
      const encodedItem = (itemEncoder as (item: unknown) => unknown)(val[i]);
      if (encodedItem === undefined) return undefined;
      encodedItems.push(encodedItem);
    }
  }

  return encodedItems;
};

export const encodeJsonObject = (
  val: unknown,
  required: ReadonlyArray<PropertyKey>,
  properties: Readonly<Record<PropertyKey, (item: unknown) => unknown>>,
  additional?: (item: unknown) => unknown
): object | undefined => {
  if (typeof val !== 'object' || val === null) return undefined;

  const unprocessedKeys = new Set(Reflect.ownKeys(val));
  const result: any = {};

  for (const [key, itemEncoder] of Object.entries(properties)) {
    if ((val as any)[key] !== undefined) {
      result[key] = itemEncoder((val as any)[key]);
      if (result[key] === undefined) return undefined;
    } else if (required.includes(key)) {
      return undefined;
    }
    unprocessedKeys.delete(key);
  }

  if (unprocessedKeys.size > 0) {
    if (additional === undefined) return undefined;
    for (const key of unprocessedKeys) {
      if ((val as any)[key] !== undefined) {
        result[key] = additional((val as any)[key]);
        if (result[key] === undefined) return undefined;
      }
      unprocessedKeys.delete(key);
    }
  }

  return result;
};
