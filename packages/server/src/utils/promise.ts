export type PromiseRaceSettleResult<T> = {
  status: 'filfilled';
  value: T;
  promise: Promise<T>;
} | {
  status: 'rejected';
  reason: any;
  promise: Promise<T>;
};

export const raceSettled =
  async <T>(promises: Iterable<Promise<T>>): Promise<PromiseRaceSettleResult<T>> =>
    new Promise<PromiseRaceSettleResult<T>>((resolve) => {
      for (const promise of promises) {
        promise
          .then((value) => resolve({
            status: 'filfilled',
            value,
            promise
          }))
          .catch((reason) => resolve({
            status: 'rejected',
            reason,
            promise
          }));
      }
    });
