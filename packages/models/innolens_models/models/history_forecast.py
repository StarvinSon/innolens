from __future__ import annotations

from argparse import ArgumentParser, Namespace
from datetime import datetime, timedelta, timezone
from typing import MutableSequence, Mapping, Any, Optional, Iterator, Sequence, Callable, TypeVar
from typing_extensions import Final
from pathlib import Path
import logging
from pprint import pprint
from math import floor
import os.path
import re

import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
import pandas as pd

from ..cli import Cli


hk_timezone: Final = timezone(timedelta(hours=8))


class HistoryForecastCli(Cli):
  name: Final[str] = 'history_forecast'

  def configure_parser(self, parser: ArgumentParser) -> None:
    subparsers = parser.add_subparsers(
      title='actions',
      required=True,
      dest='action'
    )
    for sub_cli in (
      HistoryForecastPreprocessorCli(),
      HistoryForecastModelTrainingCli()
    ):
      subparser = subparsers.add_parser(name=sub_cli.name)
      sub_cli.configure_parser(subparser)
      subparser.set_defaults(_HistoryForecastCli__handler=sub_cli.handle)

  def handle(self, args: Namespace) -> None:
    args._HistoryForecastCli__handler(args)

class HistoryForecastPreprocessorCli(Cli):
  name: Final[str] = 'preprocess'

  def configure_parser(self, parser: ArgumentParser) -> None:
    T = TypeVar('T', bound=Callable[..., Any])
    def rename(name: str, f: T) -> T:
      f.__name__ = name
      return f

    parser.add_argument(
      '--input',
      help='Path to the input data csv',
      required=True
    )
    parser.add_argument(
      '--space',
      help='Whether the access records belongs to a space or something else',
      action="store_true"
    )
    parser.add_argument(
      '--training-data',
      help='Path to the training data csv',
      required=True
    )
    parser.add_argument(
      '--evaluation-data',
      help='Path to the evaluation data csv',
      required=True
    )
    parser.add_argument(
      '--start-time',
      help='Start time',
      type=rename('datetime', lambda s: datetime.fromisoformat(s)),
      required=True
    )
    parser.add_argument(
      '--end-time',
      help='End time',
      type=rename('datetime', lambda s: datetime.fromisoformat(s)),
      required=True
    )
    parser.add_argument(
      '--time-step',
      help='Time step',
      type=rename('timedelta', lambda s: timedelta(**eval(f'dict({s})'))),
      required=True
    )
    parser.add_argument(
      '--evaluation-fraction',
      help='Fraction of data to be the evaluation data',
      type=float
    )

  def handle(self, args: Namespace) -> None:
    input_path: str = args.input
    is_space: bool = args.space
    training_data_path: str = args.training_data
    evaluation_data_path: str = args.evaluation_data
    start_time: datetime = args.start_time
    end_time: datetime = args.end_time
    time_step: timedelta = args.time_step
    evaluation_fraction: Optional[float] = args.evaluation_fraction

    preprocess(
      input_path=input_path,
      is_space=is_space,
      training_data_path=training_data_path,
      evaluation_data_path=evaluation_data_path,
      start_time=start_time,
      end_time=end_time,
      time_step=time_step,
      evaluation_fraction=evaluation_fraction
    )

class HistoryForecastModelTrainingCli(Cli):
  name: Final[str] = 'train'

  def configure_parser(self, parser: ArgumentParser) -> None:
    parser.add_argument(
      '--checkpoint-dir',
      help='The dir storing the checkpoints',
      required=True
    )
    parser.add_argument(
      '--training-data',
      help='Path to the training data csv'
    )
    parser.add_argument(
      '--evaluation-data',
      help='Path to the evaluation data csv'
    )
    parser.add_argument(
      '--log-dir',
      help='The dir storing the log for TensorBoard'
    )
    parser.add_argument(
      '--ui',
      help='Show UI or not',
      action='store_true'
    )

  def handle(self, args: Namespace) -> None:
    checkpoint_dir_path: str = args.checkpoint_dir
    training_data_path: Optional[str] = args.training_data
    evaluation_data_path: Optional[str] = args.evaluation_data
    log_dir_path: Optional[str] = args.log_dir
    show_ui: bool = args.ui

    train_model(
      checkpoint_dir_path=str(Path(checkpoint_dir_path)),
      training_data_path=None if training_data_path is None else str(Path(training_data_path)),
      evaluation_data_path=None if evaluation_data_path is None else str(Path(evaluation_data_path)),
      log_dir_path=None if log_dir_path is None else str(Path(log_dir_path)),
      show_ui=show_ui
    )


def preprocess(
  input_path: str,
  is_space: bool,
  training_data_path: str,
  evaluation_data_path: str,
  start_time: datetime,
  end_time: datetime,
  time_step: timedelta,
  evaluation_fraction: Optional[float] = None
) -> None:
  if evaluation_fraction is None:
    evaluation_fraction = 0.2

  def load_access_records(path: str) -> pd.DataFrame:
    df = pd.read_csv(
      path,
      parse_dates=['time'],
      dtype={
        'member_id': str,
        'action': (
          pd.CategoricalDtype(['enter', 'exit'])
          if is_space
          else pd.CategoricalDtype(['acquire', 'release'])
        )
      }
    )
    assert df.columns.to_list() == ['time', 'member_id', 'action']
    return df

  def iterate_spans(
    df: pd.DataFrame,
    start_time: pd.Timestamp,
    end_time: pd.Timestamp,
    time_step: pd.Timedelta
  ) -> Iterator[Mapping[str, Any]]:
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
    end_time: pd.Timestamp,
    time_step: pd.Timedelta
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
    period_end_time = period_start_time + time_step
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
      period_end_time = period_start_time + time_step

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
  spans = list(iterate_spans(
    df=input_df,
    start_time=start_time,
    end_time=end_time,
    time_step=time_step
  ))
  rows = list(iterate_rows(
    spans=spans,
    start_time=start_time,
    end_time=end_time,
    time_step=time_step
  ))
  df = to_data_frame(rows)
  assert df.notna().all(axis=None)

  # Debug purpose:
  # If the model can learn this pattern, then it should work
  # from math import pi
  # def sin_count(a: int) -> Any:
  #   return np.sin(np.arange(df.shape[0]) * a * pi / 180)
  # df['stay_count'] = sin_count(1) + sin_count(2) + sin_count(3)

  evaluation_start_idx = floor(df.shape[0] * (1 - evaluation_fraction))
  training_df = df.iloc[:evaluation_start_idx]
  evaluation_df = df.iloc[evaluation_start_idx:]

  for output_path, output_df in {
    training_data_path: training_df,
    evaluation_data_path: evaluation_df
  }.items():
    output_path_obj = Path(output_path).resolve(strict=False)
    output_path_obj.parent.mkdir(parents=True, exist_ok=True)
    output_df.to_csv(str(output_path_obj), index=False)


def train_model(
  *,
  checkpoint_dir_path: str,
  training_data_path: Optional[str] = None,
  evaluation_data_path: Optional[str] = None,
  log_dir_path: Optional[str] = None,
  show_ui: bool = False
) -> None:
  logging.getLogger().setLevel(logging.INFO)
  tf.get_logger().setLevel(logging.INFO)

  model = HistoryForecastModel(
    checkpoint_dir_path=checkpoint_dir_path,
    log_dir_path=log_dir_path
  )

  if training_data_path is not None:
    model.train(training_data_path, show_ui=show_ui)

  if evaluation_data_path is not None:
    result = model.evaluate(evaluation_data_path, show_ui=show_ui)
    pprint(result)

class HistoryForecastModel:
  __checkpoint_dir_path: Final[str]
  __log_dir_path: Final[Optional[str]]

  __model: Final[Any]
  __input_size: Final = 24 * 2 * 14 # 2 week
  __input_shift: Final = 24 * 2 # 1 day
  __predict_size: Final = 24 * 2 # 1 day
  __mean: float
  __stddev: float
  __last_epoch: int

  def __init__(
    self,
    *,
    checkpoint_dir_path: str,
    log_dir_path: Optional[str] = None
  ):
    super().__init__()

    self.__checkpoint_dir_path = checkpoint_dir_path
    self.__log_dir_path = log_dir_path

    model = tf.keras.models.Sequential([
      tf.keras.layers.LSTM(
        32,
        input_shape=(self.__input_size, 1),
        # return_sequences=True
      ),
      # tf.keras.layers.LSTM(16, activation='relu'),
      tf.keras.layers.Dense(self.__predict_size)
    ])
    self.__model = model

    model.compile(
      optimizer=tf.keras.optimizers.RMSprop(clipvalue=1.0),
      loss='mae',
      metrics=['mae', 'mse']
    )

    self.__mean = 0.0
    self.__stddev = 1.0
    self.__last_epoch = 0

    latest_ckpt = tf.train.latest_checkpoint(self.__checkpoint_dir_path)
    if latest_ckpt is not None:
      match = re.search(r'\d+', Path(latest_ckpt).name)
      if match is not None:
        self.__last_epoch = int(match[0])

        model.load_weights(latest_ckpt)
        logging.info(f'Load checkpoint from {latest_ckpt}')

        std_path = Path(self.__checkpoint_dir_path) / 'standardize_params.npz'
        arrs = np.load(std_path)
        self.__mean = np.float64(arrs['mean'])
        self.__stddev = np.float64(arrs['stddev'])

  def train(
    self,
    path: str,
    *,
    epochs: Optional[int] = None,
    steps_per_epoch: Optional[int] = None,
    show_ui: bool = False
  ) -> None:
    if epochs is None:
      epochs = 20
    if steps_per_epoch is None:
      steps_per_epoch = 10

    if self.__last_epoch == 0:
      series = pd.read_csv(
        path,
        usecols=['stay_count'],
        dtype={
          'stay_count': np.float64
        }
      )['stay_count']
      self.__mean = series.mean()
      self.__stddev = series.std()
      std_path = Path(self.__checkpoint_dir_path) / 'standardize_params.npz'
      std_path.parent.mkdir(parents=True, exist_ok=True)
      np.savez(
        std_path,
        mean=self.__mean,
        stddev=self.__stddev
      )

    training_ds = self.__load_training_ds(path)
    validation_ds = self.__load_validation_ds(path)

    callbacks = []
    callbacks.append(tf.keras.callbacks.ModelCheckpoint(
      filepath=os.path.join(self.__checkpoint_dir_path, 'checkpoint-{epoch:04d}'),
      verbose=1,
      save_weights_only=True
    ))
    if self.__log_dir_path is not None:
      callbacks.append(tf.keras.callbacks.TensorBoard(self.__log_dir_path))

    training_history = self.__model.fit(
      training_ds,
      initial_epoch=self.__last_epoch,
      epochs=self.__last_epoch + epochs,
      steps_per_epoch=10,
      validation_data=validation_ds,
      validation_steps=10,
      callbacks=callbacks
    )

    self.last_epoch = training_history.epoch[-1]

    if show_ui:
      fig = plt.figure()
      ax = fig.add_subplot()
      ax.plot(training_history.epoch, training_history.history['loss'], label='Training loss')
      ax.plot(training_history.epoch, training_history.history['val_loss'], label='Validation loss')
      ax.legend()
      plt.show()

      examples = list(validation_ds.unbatch().take(3).as_numpy_iterator())
      self.visualize_examples(examples)

  def evaluate(self, path: str, *, show_ui: bool = False) -> Any:
    evaluation_ds = self.__load_evaluation_ds(path)

    callbacks = []
    if self.__log_dir_path is not None:
      callbacks.append(tf.keras.callbacks.TensorBoard(self.__log_dir_path))

    result = self.__model.evaluate(
      evaluation_ds,
      callbacks=callbacks
    )

    if show_ui:
      examples = list(evaluation_ds.unbatch().take(3).as_numpy_iterator())
      self.visualize_examples(examples)

    return result

  def predict(self, X_batch: Any) -> Any:
    return self.__model.predict(X_batch)

  def visualize_examples(self, examples: Any) -> None:
    for X, Y in examples:
      prediction = self.predict(X.reshape((1, -1, 1)))[0]

      fig = plt.figure()
      ax = fig.add_subplot()
      ax.plot(range(-X.shape[0], 0), X, label='Input')
      ax.plot(range(0, Y.shape[0]), Y, label='Label', linestyle=' ', marker='o', alpha=0.4)
      ax.plot(range(0, prediction.shape[0]), prediction, label='Predict', linestyle=' ', marker='o', alpha=0.4)
      ax.grid(True)
      ax.legend()
      fig.tight_layout()
      plt.show()

  def __load_ds(self, path: str) -> Any:
    ds = tf.data.experimental.make_csv_dataset(
      file_pattern=path,
      header=True,
      select_columns=[
        'stay_count'
      ],
      column_defaults=[
        tf.float64
      ],
      shuffle=False,
      batch_size=1,
      num_epochs=1
    ).unbatch()
    ds = ds.map(lambda x: x['stay_count'])

    ds = ds.window(size=self.__input_size + self.__predict_size, shift=self.__input_shift, drop_remainder=True)
    ds = ds.flat_map(lambda sub: sub.batch(self.__input_size + self.__predict_size))
    ds = ds.map(lambda x: (
      (tf.reshape(x[:-self.__predict_size], [-1, 1]) - self.__mean) / self.__stddev,
      x[-self.__predict_size:]
    ))
    return ds

  def __load_training_ds(self, path: str) -> Any:
    ds = self.__load_ds(path)
    return ds.cache().shuffle(10000).batch(128).repeat()

  def __load_validation_ds(self, path: str) -> Any:
    ds = self.__load_ds(path)
    return ds.batch(128).repeat()

  def __load_evaluation_ds(self, path: str) -> Any:
    ds = self.__load_ds(path)
    return ds.batch(128)
