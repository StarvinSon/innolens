/**
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt
 */
export const strictParseInt = (text: string): number => {
  if (/^[-+]?(\d+|Infinity)$/.test(text)) {
    return Number(text);
  }
  return NaN;
};
