export const stackYs = (
  ys: ReadonlyArray<ReadonlyArray<number>>
): ReadonlyArray<ReadonlyArray<number>> => {
  const rYs: Array<ReadonlyArray<number>> = ys.slice();
  for (let k = rYs.length - 2; k >= 0; k -= 1) {
    rYs[k] = rYs[k].map((yi, i) => yi + rYs[k + 1][i]);
  }
  return rYs;
};
