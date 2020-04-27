from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Any, Optional
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

features: Final = (
  'inno_wing',
  'ar_vr_room',
  'laser_cutting_room',
  'machine_room',
  'brainstorming_area',
  'common_makerspace_area_1',
  'common_makerspace_area_2',
  'digital_learning_lab',
  'electronic_workbenches',
  'event_hall_a',
  'event_hall_b',
  'meeting_room_1',
  'meeting_room_2',
  'open_event_area',
  'sound_proof_room',
  'workshop_1',
  'workshop_2',
  'workshop_3',
  'workshop_4',
  'workshop_5',
  'workshop_6',
  'workshop_7',
  'workshop_8',
  'workshop_9'
)

# Show these moments in plots
interested_times: Final = (
  datetime(2020, 4, 27, 12, 30, tzinfo=hk_timezone), # Mon
  datetime(2020, 4, 27, 13, 30, tzinfo=hk_timezone) # Mon
)

# Only show these in plots
interested_features: Final = (
  'inno_wing',
  'machine_room',
  'digital_learning_lab',
  'event_hall_a',
  'event_hall_b',
  'open_event_area'
)


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

  model = AccessCausalityModel(
    checkpoint_dir_path=checkpoint_dir_path,
    log_dir_path=log_dir_path
  )

  if training_data_path is not None:
    model.train(training_data_path, show_ui=show_ui)

  if evaluation_data_path is not None:
    result = model.evaluate(evaluation_data_path, show_ui=show_ui)
    pprint(result)

class AccessCausalityModel:
  __checkpoint_dir_path: Final[str]
  __log_dir_path: Final[Optional[str]]

  __model: Final[Any]
  __history_window_size: Final = 4 * 2 # 4 hours
  __forecast_window_size: Final = 1 * 2 # 1 hour
  __window_shift: Final = 1 # 30 minutes
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
      keras.layers.Dense(
        (len(features) * self.__history_window_size) ** 2, # TODO: tune
        input_shape=(len(features) * self.__history_window_size,),
        activation=tf.nn.relu
      ),
      keras.layers.Dense(
        len(features) * self.__forecast_window_size,
      )
    ])
    self.__model = model

    model.compile(
      optimizer=keras.optimizers.Adam(),
      loss='mae',
      metrics=['mae', 'mse']
    )

    self.__mean = np.float_(0.0)
    self.__stddev = np.float_(1.0)
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
      # Commented below to not standardize the features
      # df = self.__load_dataframe(path)
      # self.__mean = df.values.mean()
      # self.__stddev = df.values.std()
      std_path = Path(self.__checkpoint_dir_path) / 'standardize_params.npz'
      std_path.parent.mkdir(parents=True, exist_ok=True)
      np.savez(
        std_path,
        mean=self.__mean,
        stddev=self.__stddev
      )

    ds = self.__load_dataset(path)
    # Use the first 30 days as the validation set
    train_ds = ds.skip(30 * 24 * 2).cache().shuffle(10000).batch(128).repeat()
    val_ds = ds.take(30 * 24 * 2).cache().batch(128).repeat()

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
      self.__visualize_examples(path, 'Training')

  def evaluate(self, path: str, *, show_ui: bool = False) -> Any:
    ds = self.__load_dataset(path)
    eval_ds = ds.shuffle(1000).batch(128).repeat().take(10)

    callbacks = []
    if self.__log_dir_path is not None:
      callbacks.append(keras.callbacks.TensorBoard(self.__log_dir_path))

    result = self.__model.evaluate(
      eval_ds,
      callbacks=callbacks
    )

    if show_ui:
      self.__visualize_examples(path, 'evaluation')

    return result

  def __load_dataframe(self, path: str) -> pd.DataFrame:
    with open(path) as file:
      data = json.load(file)
    df = pd.DataFrame({
      feature: pd.Series(data['values'][f], dtype=np.int32)
      for f, feature in enumerate(data['features'])
    })
    df['start_time'] = pd.Series(
      [datetime.fromisoformat(start_time) for start_time, _ in data['timeSpans']],
      dtype=pd.DatetimeTZDtype(tz=hk_timezone)
    )
    df['end_time'] = pd.Series(
      [datetime.fromisoformat(end_time) for _, end_time in data['timeSpans']],
      dtype=pd.DatetimeTZDtype(tz=hk_timezone)
    )
    assert df.notna().all(None)

    df = df[['start_time', 'end_time', *features]]
    return df

  def __load_dataset(self, path: str) -> Any:
    df = self.__load_dataframe(path)

    ds = tf.data.Dataset.from_tensor_slices({
      feature: df[feature].to_numpy()
      for feature in features
    })
    ds = ds.map(lambda xs: {
      name: (x - self.__mean) / self.__stddev
      for name, x in xs.items()
    })
    ds = ds.window(size=self.__history_window_size + self.__forecast_window_size, shift=self.__window_shift, drop_remainder=True)
    ds = ds.flat_map(lambda dsd: tf.data.Dataset.zip({
      name: sub_vals.batch(self.__history_window_size + self.__forecast_window_size).map(lambda x: tf.reshape(x, [self.__history_window_size + self.__forecast_window_size]))
      for name, sub_vals in dsd.items()
    }))
    ds = ds.map(lambda xs: {
      name: (x[:-self.__forecast_window_size], x[-self.__forecast_window_size:])
      for name, x in xs.items()
    })
    ds = ds.map(lambda xys: (
      tf.reshape(tf.stack([xys[feature][0] for feature in features]), shape=(-1,)), # Flatten to 1D array
      tf.reshape(tf.stack([xys[feature][1] for feature in features]), shape=(-1,))
    ))
    return ds

  def __visualize_examples(self, path: str, subtitle: str) -> None:
    df = self.__load_dataframe(path)

    history_batch = []
    label_batch = []
    for time in interested_times:
      start_idx = df[df['end_time'] == time].index[0]
      history_batch.append(df.iloc[start_idx - self.__history_window_size + 1 : start_idx + 1, :]) # including end
      label_batch.append(df.iloc[start_idx + 1 : start_idx + self.__forecast_window_size + 1, :])

    forecast_batch = self.predict(history_batch)

    for i, (time, history, label, forecast) in enumerate(zip(interested_times, history_batch, label_batch, forecast_batch)):
      fig = plt.figure()
      fig.suptitle(f'{time.isoformat()} ({i + 1}/{len(interested_times)}, {subtitle})')
      axs = fig.subplots(ceil(len(interested_features) / 2), 2).flatten()

      for feature, ax in zip(interested_features, axs):
        feature_history = history[feature]
        feature_forecast = forecast[feature]

        ax.set_title(f'{feature}')
        ax.plot(
          np.arange(-feature_history.shape[0] + 1, 1),
          feature_history,
          label='history'
        )
        ax.plot(
          np.arange(1, feature_forecast.shape[0] + 1),
          feature_forecast,
          label='label',
          marker='o',
          alpha=0.4
        )
        ax.plot(
          np.arange(1, feature_forecast.shape[0] + 1),
          feature_forecast,
          label='forecast',
          marker='x',
          alpha=0.4
        )
        ax.grid(True)
        ax.legend()

      fig.tight_layout()
      plt.show()

  def predict(self, history_batch: Any) -> Any:
    X_batch = np.vstack([
      np.vstack([
        history[feature]
        for feature in features
      ]).reshape((-1,))
      for history in history_batch
    ])
    X_batch = (X_batch - self.__mean) / self.__stddev

    predictions = self.__model.predict(X_batch)
    predictions = predictions * self.__stddev + self.__mean

    def iter_forecast() -> Any:
      for i in range(len(history_batch)):
        prediction = predictions[i].reshape((len(features), self.__forecast_window_size))
        yield {
          feature: prediction[f]
          for f, feature in enumerate(features)
        }
    return list(iter_forecast())
