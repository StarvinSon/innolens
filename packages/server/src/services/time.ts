import { addMilliseconds } from 'date-fns';


export const timeSpanRange = (
  from: Date,
  to: Date,
  stepMs: number
): ReadonlyArray<readonly [Date, Date]> => {
  const timeSpans: Array<readonly [Date, Date]> = [];
  for (
    let periodStartTime = from, periodEndTime = addMilliseconds(periodStartTime, stepMs);
    periodStartTime < to;
    periodStartTime = periodEndTime, periodEndTime = addMilliseconds(periodEndTime, stepMs)
  ) {
    timeSpans.push([periodStartTime, periodEndTime]);
  }
  return timeSpans;
};

export const timeSpanRepeat = (
  from: Date,
  stepMs: number,
  count: number
): ReadonlyArray<readonly [Date, Date]> => {
  const timeSpans: Array<readonly [Date, Date]> = [];
  for (
    let periodStartTime = from, periodEndTime = addMilliseconds(periodStartTime, stepMs), i = 0;
    i < count;
    periodStartTime = periodEndTime, periodEndTime = addMilliseconds(periodEndTime, stepMs), i += 1
  ) {
    timeSpans.push([periodStartTime, periodEndTime]);
  }
  return timeSpans;
};
