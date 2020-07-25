import { parseISO } from 'date-fns';


export const decodeJsonNull = (val: unknown): null | undefined =>
  val === null ? null : undefined;

export const decodeJsonBoolean = (val: unknown): boolean | undefined =>
  typeof val === 'boolean' ? val : undefined;

export const decodeJsonInteger = (val: unknown): number | undefined =>
  typeof val === 'number' && Number.isInteger(val) ? val : undefined;

export const decodeJsonNumber = (val: unknown): number | undefined =>
  typeof val === 'number' ? val : undefined;

export const decodeJsonString = (val: unknown): string | undefined =>
  typeof val === 'string' ? val : undefined;

export const decodeJsonDate = (val: unknown): Date | undefined => {
  let maybeDate: Date;
  if (typeof val === 'string' && !Number.isNaN((maybeDate = parseISO(val)).getTime())) {
    return maybeDate;
  }
  return undefined;
};

type ArrayItemParser<T> = (item: unknown) => T | undefined;
type ArrayItemParserTuples = ReadonlyArray<ArrayItemParser<any>>;

type DecodedArray<I extends ArrayItemParser<any> | ArrayItemParserTuples> =
  I extends ArrayItemParser<infer U> ? ReadonlyArray<U>
    : { readonly [K in keyof I]: I[K] extends ArrayItemParser<infer U> ? U : never };

export const decodeJsonArray = <I extends ArrayItemParser<any> | ArrayItemParserTuples>(
  val: unknown,
  itemParser: I
): DecodedArray<I> | undefined => {
  if (!Array.isArray(val)) return undefined;

  const decodedItems: Array<any> = [];

  if (Array.isArray(itemParser)) {
    for (let i = 0; i < itemParser.length; i += 1) {
      if (i >= val.length) return undefined;
      const decodedItem = itemParser[i](val[i]);
      if (decodedItem === undefined) return undefined;
      decodedItems.push(decodedItem);
    }
  } else {
    for (let i = 0; i < val.length; i += 1) {
      const decodedItem = (itemParser as ArrayItemParser<any>)(val[i]);
      if (decodedItem === undefined) return undefined;
      decodedItems.push(decodedItem);
    }
  }

  return decodedItems as any;
};

type DecodedJsonType<
  M extends { readonly [key: string]: (item: unknown) => any },
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
export const decodeJsonObject = <
  M extends { readonly [key: string]: (item: unknown) => any },
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
    of Object.entries(properties) as Array<[keyof M, (item: unknown) => unknown]>
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
