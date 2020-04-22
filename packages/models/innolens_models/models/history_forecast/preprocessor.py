from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import MutableSequence, Mapping, Any, Iterator, Sequence
from typing_extensions import Final
from pathlib import Path
from math import floor

import numpy as np
import pandas as pd


hk_timezone: Final = timezone(timedelta(hours=8))


def preprocess(
  input_path: str,
  is_space: bool,
  training_data_path: str,
  evaluation_data_path: str,
  start_time: datetime,
  end_time: datetime
) -> None:

  def load_access_records(path: str) -> pd.DataFrame:
    df = pd.read_csv(
      path,
      parse_dates=['time'],
      dtype={
        'member_id': pd.StringDtype(),
        'action': (
          pd.CategoricalDtype(['enter', 'exit'])
          if is_space
          else pd.CategoricalDtype(['acquire', 'release'])
        )
      }
    )
    assert df.columns.to_list() == ['time', 'member_id', 'action']
    return df

  def iterate_spans(df: pd.DataFrame) -> Iterator[Mapping[str, Any]]:
    df = df.sort_values('time')

    staying_uids = {}
    for _, row in df.iterrows():
      time = row['time']
      uid = row['member_id']
      action = row['action']
      if action == 'enter' or action == 'acquire':
        staying_uids[uid] = time
      elif action == 'exit' or action == 'release':
        enter_time = staying_uids.get(uid)
        if enter_time is not None:
          if enter_time < time:
            yield {
              'enter_time': enter_time,
              'exit_time': time,
              'member_id': uid
            }
          del staying_uids[uid]

  def iterate_rows(
    spans: Sequence[Mapping[str, Any]],
    start_time: pd.Timestamp,
    end_time: pd.Timestamp
  ) -> Iterator[Mapping[str, Any]]:

    def time_components(prefix: str, time: pd.Timestamp) -> Mapping[str, Any]:
      time = time.astimezone(hk_timezone)
      return {
        prefix: time,
        f'{prefix}_year': time.year,
        f'{prefix}_month': time.month,
        f'{prefix}_day': time.day,
        f'{prefix}_weekday': time.weekday(),
        f'{prefix}_hour': time.hour,
        f'{prefix}_minute': time.minute
      }

    period_start_time = start_time
    period_end_time = period_start_time + timedelta(minutes=30)
    i = 0
    curr_spans: MutableSequence[Mapping[str, Any]] = []
    while period_end_time <= end_time:

      while i < len(spans) and spans[i]['enter_time'] < period_end_time:
        if spans[i]['exit_time'] > period_start_time:
          curr_spans.append(spans[i])
        i += 1

      enter_count = sum(
        span['enter_time'] >= period_start_time
        for span in curr_spans
      )
      unique_enter_count = len(set(
        span['member_id']
        for span in curr_spans
        if span['enter_time'] >= period_start_time
      ))
      exit_count = sum(
        span['exit_time'] <= period_end_time
        for span in curr_spans
      )
      unique_exit_count = len(set(
        span['member_id']
        for span in curr_spans
        if span['exit_time'] <= period_end_time
      ))
      stay_count = len(curr_spans)
      unique_stay_count = len(set(
        span['member_id']
        for span in curr_spans
      ))
      yield {
        **time_components('start_time', period_start_time),
        **time_components('end_time', period_end_time),
        'enter_count': enter_count,
        'unique_enter_count': unique_enter_count,
        'exit_count': exit_count,
        'unique_exit_count': unique_exit_count,
        'stay_count': stay_count,
        'unique_stay_count': unique_stay_count
      }

      curr_spans = [
        span
        for span in curr_spans
        if span['exit_time'] > period_end_time
      ]
      period_start_time = period_end_time
      period_end_time = period_start_time + timedelta(minutes=30)

  def to_data_frame(rows: Sequence[Mapping[str, Any]]) -> pd.DataFrame:

    def time_columns(prefix: str) -> Mapping[str, Any]:
      return {
        prefix: pd.DatetimeTZDtype(tz=hk_timezone),
        f'{prefix}_year': np.uint16,
        f'{prefix}_month': pd.CategoricalDtype(range(1, 13), ordered=True),
        f'{prefix}_day': pd.CategoricalDtype(range(1, 32), ordered=True),
        f'{prefix}_weekday': pd.CategoricalDtype(range(0, 7), ordered=True),
        f'{prefix}_hour': pd.CategoricalDtype(range(0, 24), ordered=True),
        f'{prefix}_minute': pd.CategoricalDtype(range(0, 60), ordered=True)
      }

    return pd.DataFrame({
      name: pd.Series((
        item[name]
        for item in rows
      ), dtype=dtype)
      for name, dtype in {
        **time_columns('start_time'),
        **time_columns('end_time'),
        'enter_count': np.uint16,
        'unique_enter_count': np.uint16,
        'exit_count': np.uint16,
        'unique_exit_count': np.uint16,
        'stay_count': np.uint16,
        'unique_stay_count': np.uint16
      }.items()
    })

  input_df = load_access_records(input_path)
  spans = list(iterate_spans(df=input_df))
  rows = list(iterate_rows(
    spans=spans,
    start_time=start_time,
    end_time=end_time
  ))
  df = to_data_frame(rows)
  assert df.notna().all(axis=None)

  # Debug purpose:
  # If the model can learn this pattern, then it should work
  # from math import pi
  # def sin_count(a: int) -> Any:
  #   return (5 * np.sin(np.arange(df.shape[0]) * a * pi / 180)).astype(np.int32)
  # df['stay_count'] = sin_count(1) + sin_count(2) + sin_count(3)

  training_count = floor(df.shape[0] * 0.8 / (24 * 2)) * (24 * 2)
  training_df = df.iloc[:training_count]
  evaluation_df = df.iloc[training_count:]

  for output_path, output_df in {
    training_data_path: training_df,
    evaluation_data_path: evaluation_df
  }.items():
    output_path_obj = Path(output_path).resolve(strict=False)
    output_path_obj.parent.mkdir(parents=True, exist_ok=True)
    output_df.to_csv(str(output_path_obj), index=False)
