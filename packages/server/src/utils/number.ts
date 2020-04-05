export const parseInteger = (str: string, radix: number = 10): number => {
  const num = Number.parseInt(str, radix);
  if (Number.isNaN(num) || String(num) !== str) {
    return NaN;
  }
  return num;
};
