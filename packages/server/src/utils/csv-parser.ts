import { parseISO } from 'date-fns';


export const decodeCsvNull = (str: string): null | undefined =>
  str === 'null' ? null : undefined;

export const decodeCsvBoolean = (str: string): boolean | undefined => {
  switch (str) {
    case 'true': return true;
    case 'false': return false;
    default: return undefined;
  }
};

export const decodeCsvInteger = (str: string): number | undefined => {
  const int = Number.parseInt(str, 10);
  if (Number.isNaN(int) || String(int) !== str) {
    return undefined;
  }
  return int;
};

export const decodeCsvNumber = (str: string): number | undefined => {
  const num = Number.parseFloat(str);
  if (Number.isNaN(num) || String(num) !== str) {
    return undefined;
  }
  return num;
};
export const decodeCsvString = (str: string): string | undefined => str;

export const decodeCsvDate = (str: string): Date | undefined => {
  const time = parseISO(str);
  if (Number.isNaN(time.getTime())) {
    return undefined;
  }
  return time;
};

export const decodeCsvArray = <T>(
  str: string,
  itemDecoder: (item: string) => T | undefined
): Array<T> | undefined => {
  if (str === '') return [];
  const itemStrs = str.split(',');
  const decodedItems: Array<T> = [];
  for (const itemStr of itemStrs) {
    const decodedItem = itemDecoder(decodeURIComponent(itemStr));
    if (decodedItem === undefined) return undefined;
    decodedItems.push(decodedItem);
  }
  return decodedItems;
};

type DecodedJsonType<
  M extends { readonly [key: string]: (item: string) => any },
  A
> = [A] extends [never]
  ? {
    readonly [P in keyof M]: Exclude<ReturnType<M[P]>, undefined>
  }
  : ({
    readonly [P in keyof M]: Exclude<ReturnType<M[P]>, undefined>
  } & {
    readonly [key: string]: Exclude<A, undefined>
  });

/* eslint-disable @typescript-eslint/indent */
export const decodeCsvRecord = <
  M extends { readonly [key: string]: (item: string) => any },
  A = never
>(
  val: unknown,
  required: ReadonlyArray<keyof M>,
  properties: M,
  additional?: (item: unknown) => A | undefined
): DecodedJsonType<M, A> | undefined => {
  /* eslint-enable @typescript-eslint/indent */
  if (typeof val !== 'object' || val === null) return undefined;

  const unprocessedKeys = new Set(Reflect.ownKeys(val));
  const result: any = {};

  for (
    const [key, itemDecoder]
    of Object.entries(properties) as Array<[keyof M, (item: string) => unknown]>
  ) {
    if ((val as any)[key] !== undefined) {
      result[key] = itemDecoder((val as any)[key]);
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
