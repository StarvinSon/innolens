'''
This model use LSTM model, which does not perform well...
Reference: https://www.tensorflow.org/tutorials/structured_data/time_series
'''

from __future__ import annotations

from datetime import timedelta, timezone
from typing import Any, Optional, Sequence
from typing_extensions import Final
from pathlib import Path
import logging
from pprint import pprint
from math import ceil
import os.path
import re

import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
import pandas as pd


hk_timezone: Final = timezone(timedelta(hours=8))


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
  __predict_size: Final = 2 * 24 * 2 # 2 days
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
        input_shape=(self.__input_size, 1)
      ),
      tf.keras.layers.Dense(self.__predict_size)
    ])
    self.__model = model

    model.compile(
      optimizer=tf.keras.optimizers.RMSprop(
        # clipvalue=1.0
      ),
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
      epochs = 10
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

    ds = self.__load_ds(path)
    train_ds = ds.skip(7).shuffle(10000).batch(128).repeat()
    val_ds = ds.take(7).batch(128).repeat()
    example_ds = ds.take(7).shuffle(1000).take(6)

    callbacks = []
    callbacks.append(tf.keras.callbacks.ModelCheckpoint(
      filepath=os.path.join(self.__checkpoint_dir_path, 'checkpoint-{epoch:04d}'),
      verbose=1,
      save_weights_only=True
    ))
    if self.__log_dir_path is not None:
      callbacks.append(tf.keras.callbacks.TensorBoard(self.__log_dir_path))

    training_history = self.__model.fit(
      train_ds,
      initial_epoch=self.__last_epoch,
      epochs=self.__last_epoch + epochs,
      steps_per_epoch=10,
      validation_data=val_ds,
      validation_steps=10,
      callbacks=callbacks
    )
    self.last_epoch = training_history.epoch[-1]

    if show_ui:
      examples = list(example_ds.as_numpy_iterator())
      self.__visualize_examples(examples, 'Validation')

  def evaluate(self, path: str, *, show_ui: bool = False) -> Any:
    ds = self.__load_ds(path)
    exmaple_ds = ds.shuffle(1000).take(6)
    eval_ds = ds.batch(128)

    callbacks = []
    if self.__log_dir_path is not None:
      callbacks.append(tf.keras.callbacks.TensorBoard(self.__log_dir_path))

    result = self.__model.evaluate(
      eval_ds,
      callbacks=callbacks
    )

    if show_ui:
      examples = list(exmaple_ds.as_numpy_iterator())
      self.__visualize_examples(examples, 'Evaluation')

    return result

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
    ds = ds.map(lambda x: (x - self.__mean) / self.__stddev)
    ds = ds.window(size=self.__input_size + self.__predict_size, shift=self.__input_shift, drop_remainder=True)
    ds = ds.flat_map(lambda sub: sub.batch(self.__input_size + self.__predict_size).map(lambda x: tf.reshape(x, [self.__input_size + self.__predict_size])))
    ds = ds.map(lambda x: (
      tf.reshape(x[:-self.__predict_size], [-1, 1]),
      x[-self.__predict_size:]
    ))
    return ds

  def __visualize_examples(self, examples: Sequence[Any], title: str) -> None:
    fig = plt.figure()
    axs = fig.subplots(ceil(len(examples) / 2), 2).reshape((-1,))
    for i, ((X, Y), ax) in enumerate(zip(examples, axs)):
      prediction = self.__model.predict(X.reshape((1, -1, 1)))[0]
      ax.set_title(f'{title} {i}')
      ax.plot(range(-X.shape[0], 0), X, label='Input')
      ax.plot(range(0, Y.shape[0]), Y, label='Label', marker='o', alpha=0.4)
      ax.plot(range(0, prediction.shape[0]), prediction, label='Predict', marker='o', alpha=0.4)
      ax.grid(True)
      ax.legend()
    fig.tight_layout()
    plt.show()

  def predict(self, X_batch: Any) -> Any:
    predictions = self.__model.predict((X_batch - self.__mean) / self.__stddev)
    return predictions * self.__stddev + self.__mean
