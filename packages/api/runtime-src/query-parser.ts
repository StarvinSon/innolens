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

export const decodeQueryArray = <T>(
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
