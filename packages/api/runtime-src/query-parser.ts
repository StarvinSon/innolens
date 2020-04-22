import { parseISO } from 'date-fns';


export const decodeQueryNull = (str: string): null | undefined =>
  str === 'null' ? null : undefined;

export const decodeQueryBoolean = (str: string): boolean | undefined => {
  switch (str) {
    case 'true': return true;
    case 'false': return false;
    default: return undefined;
  }
};

export const decodeQueryInteger = (str: string): number | undefined => {
  const int = Number.parseInt(str, 10);
  if (Number.isNaN(int) || String(int) !== str) {
    return undefined;
  }
  return int;
};

export const decodeQueryNumber = (str: string): number | undefined => {
  const num = Number.parseFloat(str);
  if (Number.isNaN(num) || String(num) !== str) {
    return undefined;
  }
  return num;
};
export const decodeQueryString = (str: string): string | undefined => str;

export const decodeQueryDate = (str: string): Date | undefined => {
  const time = parseISO(str);
  if (Number.isNaN(time.getTime())) {
    return undefined;
  }
  return time;
};

type ArrayItemParser<T> = (item: string) => T | undefined;
type ArrayItemParserTuples = ReadonlyArray<ArrayItemParser<any>>;

type DecodedArray<I extends ArrayItemParser<any> | ArrayItemParserTuples> =
  I extends ArrayItemParser<infer U> ? ReadonlyArray<U>
    : { readonly [K in keyof I]: I[K] extends ArrayItemParser<infer U> ? U : never };

export const decodeQueryArray = <I extends ArrayItemParser<any> | ArrayItemParserTuples>(
  str: string,
  itemParser: I
): DecodedArray<I> | undefined => {
  if (str === '') return [] as any;

  const itemStrs = str.split(',').map(decodeURIComponent);
  const decodedItems: Array<any> = [];

  if (Array.isArray(itemParser)) {
    for (let i = 0; i < itemParser.length; i += 1) {
      if (i >= itemStrs.length) return undefined;
      const parsedItem = itemParser[i](itemStrs[i]);
      if (parsedItem === undefined) return undefined;
      decodedItems.push(parsedItem);
    }
  } else {
    for (let i = 0; i < itemStrs.length; i += 1) {
      const parsedItem = (itemParser as ArrayItemParser<any>)(itemStrs[i]);
      if (parsedItem === undefined) return undefined;
      decodedItems.push(parsedItem);
    }
  }

  return decodedItems as any;
};
