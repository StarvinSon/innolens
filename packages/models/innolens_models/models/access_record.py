from __future__ import annotations

from datetime import datetime
from math import ceil, floor
from typing import MutableSequence, Iterator, Mapping, Any
from pathlib import Path

import pandas as pd


def load_access_records(path: str) -> pd.DataFrame:
  df = pd.read_csv(
    path,
    parse_dates=['Time'],
    dtype={
      'UID': str,
      'Action': pd.CategoricalDtype(['enter', 'exit'])
    }
  )
  assert df.columns.to_list() == ['Time', 'UID', 'Action']
  return df

def preprocess_access_records(df: pd.DataFrame, start_time: pd.Timestamp, end_time: pd.Timestamp, time_step: pd.Timedelta) -> pd.DataFrame:
  df = df.sort_values('Time')

  def iterate_spans() -> Iterator[Mapping[str, Any]]:
    staying_uids = {}
    for _, row in df.iterrows():
      time = row['Time']
      uid = row['UID']
      action = row['Action']
      if action == 'enter':
        staying_uids[uid] = time
      elif action == 'exit':
        enter_time = staying_uids.get(uid)
        if enter_time is not None:
          if enter_time < time:
            yield {
              'Enter Time': enter_time,
              'Exit Time': time,
              'UID': uid
            }
          del staying_uids[uid]

  spans = list(iterate_spans())

  def iterate_rows() -> Iterator[Mapping[str, Any]]:
    period_start_time = start_time
    period_end_time = period_start_time + time_step
    i = 0
    curr_spans: MutableSequence[Mapping[str, Any]] = []
    while period_end_time <= end_time:

      while i < len(spans) and spans[i]['Enter Time'] < period_end_time:
        if spans[i]['Exit Time'] > period_start_time:
          curr_spans.append(spans[i])
        i += 1

      enter_count = sum(
        span['Enter Time'] >= period_start_time
        for span in curr_spans
      )
      unique_enter_count = len(set(
        span['UID']
        for span in curr_spans
        if span['Enter Time'] >= period_start_time
      ))
      exit_count = sum(
        span['Exit Time'] <= period_end_time
        for span in curr_spans
      )
      unique_exit_count = len(set(
        span['UID']
        for span in curr_spans
        if span['Exit Time'] <= period_end_time
      ))
      stay_count = len(curr_spans)
      unique_stay_count = len(set(
        span['UID']
        for span in curr_spans
      ))
      yield {
        'Start Time': period_start_time,
        'End Time': period_end_time,
        'Enter Count': enter_count,
        'Unique Enter Count': unique_enter_count,
        'Exit Count': exit_count,
        'Unique Exit Count': unique_exit_count,
        'Stay Count': stay_count,
        'Unique Stay Count': unique_stay_count
      }

      curr_spans = [
        span
        for span in curr_spans
        if span['Exit Time'] > period_end_time
      ]
      period_start_time = period_end_time
      period_end_time = period_start_time + time_step

  return pd.DataFrame.from_records(iterate_rows())


if __name__ == '__main__':
  from datetime import timezone, timedelta
  df = load_access_records('../simulator/simulation_result/inno_wing_access_records.csv')
  pdf = preprocess_access_records(
    df,
    pd.Timestamp(year=2019, month=9, day=1, tzinfo=timezone(timedelta(hours=8))),
    pd.Timestamp(year=2019, month=12, day=1, tzinfo=timezone(timedelta(hours=8))),
    pd.Timedelta(minutes=30)
  )
  output_dir = Path('preprocessed')
  output_dir.mkdir(parents=True, exist_ok=True)
  pdf.to_csv(output_dir / 'test.csv', index=False)
