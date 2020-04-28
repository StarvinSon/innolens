from __future__ import annotations

from datetime import timedelta, timezone
from typing import Any, Optional, Sequence
from typing_extensions import Final
from pathlib import Path
import logging
from pprint import pprint
import os.path
import re
import json

import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf
from tensorflow import keras
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
  __input_shift: Final = 1 # 30 minutes
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

    model = keras.models.Sequential([
      # keras.layers.Dense(256, activation=tf.nn.relu),
      keras.layers.Dense(self.__predict_size)
    ])
    self.__model = model

    model.compile(
      optimizer=keras.optimizers.Adam(
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
    validation_steps: Optional[int] = None,
    show_ui: bool = False
  ) -> None:
    if epochs is None:
      epochs = 20
    if steps_per_epoch is None:
      steps_per_epoch = 20
    if validation_steps is None:
      validation_steps = 10

    if self.__last_epoch == 0:
      df = self.__load_dataframe(path)
      self.__mean = df.values.mean()
      self.__stddev = df.values.std()
      std_path = Path(self.__checkpoint_dir_path) / 'standardize_params.npz'
      std_path.parent.mkdir(parents=True, exist_ok=True)
      np.savez(
        std_path,
        mean=self.__mean,
        stddev=self.__stddev
      )

    ds = self.__load_dataset(path)
    train_ds = ds.skip(30 * 24 * 2).shuffle(10000).batch(128).repeat()
    val_ds = ds.take(30 * 24 * 2).batch(128).repeat()
    example_ds = val_ds.unbatch().shuffle(1000).take(24)

    callbacks = []
    callbacks.append(keras.callbacks.ModelCheckpoint(
      filepath=os.path.join(self.__checkpoint_dir_path, 'checkpoint-{epoch:04d}'),
      verbose=1,
      save_weights_only=True
    ))
    if self.__log_dir_path is not None:
      callbacks.append(keras.callbacks.TensorBoard(self.__log_dir_path))

    training_history = self.__model.fit(
      train_ds,
      initial_epoch=self.__last_epoch,
      epochs=self.__last_epoch + epochs,
      steps_per_epoch=steps_per_epoch,
      validation_data=val_ds,
      validation_steps=validation_steps,
      callbacks=callbacks
    )
    self.last_epoch = training_history.epoch[-1]

    if show_ui:
      examples = list(example_ds.as_numpy_iterator())
      self.__visualize_examples(examples, 'Validation')

  def evaluate(self, path: str, *, show_ui: bool = False) -> Any:
    ds = self.__load_dataset(path)
    eval_ds = ds.shuffle(1000).batch(128).repeat().take(10)
    exmaple_ds = ds.shuffle(1000).take(12)

    callbacks = []
    if self.__log_dir_path is not None:
      callbacks.append(keras.callbacks.TensorBoard(self.__log_dir_path))

    result = self.__model.evaluate(
      eval_ds,
      callbacks=callbacks
    )

    if show_ui:
      examples = list(exmaple_ds.as_numpy_iterator())
      self.__visualize_examples(examples, 'Evaluation')

    return result

  def __load_dataframe(self, path: str) -> pd.DataFrame:
    with open(path) as file:
      data = json.load(file)
    df = pd.DataFrame({
      group: pd.Series(data['values'][g], dtype=np.int32)
      for g, group in enumerate(data['groups'])
    })
    assert df.notna().all(None)
    return df

  def __load_dataset(self, path: str) -> Any:
    df = self.__load_dataframe(path)

    ds = tf.data.Dataset.from_tensor_slices({
      name: series.to_numpy()
      for name, series in df.items()
    })
    ds = ds.map(lambda xs: {
      name: (x - self.__mean) / self.__stddev
      for name, x in xs.items()
    })
    ds = ds.window(size=self.__input_size + self.__predict_size, shift=self.__input_shift, drop_remainder=True)
    ds = ds.flat_map(lambda dsd: tf.data.Dataset.zip({
      name: sub_vals.batch(self.__input_size + self.__predict_size).map(lambda x: tf.reshape(x, [self.__input_size + self.__predict_size]))
      for name, sub_vals in dsd.items()
    }))
    ds = ds.map(lambda xs: {
      name: (x[:-self.__predict_size], x[-self.__predict_size:])
      for name, x in xs.items()
    })
    ds = ds.flat_map(lambda xs: tf.data.Dataset.from_tensor_slices((
      [xy[0] for xy in xs.values()],
      [xy[1] for xy in xs.values()]
    )))
    return ds

  def __visualize_examples(self, examples: Sequence[Any], title: str) -> None:
    for i in range(0, len(examples), 6):
      fig = plt.figure()
      axs = fig.subplots(3, 2).flatten()
      for j, ((X, Y), ax) in enumerate(zip(examples[i:i+6], axs)):
        prediction = self.__model.predict(X.reshape((1, -1)))[0]
        ax.set_title(f'{title} {i + j}')
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
