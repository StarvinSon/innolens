from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Any, Optional, Iterable, ClassVar, Sequence
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


class MissingFeautureException(Exception):
  def __init__(self, features: Iterable[str]):
    features_str = ', '.join(features)
    super().__init__(f'Missing features: {features_str}')

class UnknownFeautureException(Exception):
  def __init__(self, features: Iterable[str]):
    features_str = ', '.join(features)
    super().__init__(f'Unknown features: {features_str}')


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
  checkpoint_dir_path: Final[str]
  log_dir_path: Final[Optional[str]]

  history_window_size: Final = 2 * 2 # 2 hours
  forecast_window_size: Final = 1 * 2 # 1 hour
  window_shift: Final = 1 # 30 minutes
  time_step_ms: Final = 30 * 60 * 1000 # 30 minutes, not used by this class, just a constant for the server

  features: Final[ClassVar[Sequence[str]]] = [
    # 'inno_wing',
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
  ]

  # Show these moments in plots
  interested_times: Final[ClassVar[Sequence[datetime]]] = [
    datetime(2020, 4, 27, 12, 30, tzinfo=hk_timezone), # Mon
    datetime(2020, 4, 27, 13, 30, tzinfo=hk_timezone) # Mon
  ]

  # Only show these in plots
  interested_features: Final[ClassVar[Sequence[str]]] = [
    'open_event_area',
    'brainstorming_area',
    'event_hall_a',
    'event_hall_b',
    'digital_learning_lab',
    'machine_room'
  ]

  __model: Final[Any]
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

    self.checkpoint_dir_path = checkpoint_dir_path
    self.log_dir_path = log_dir_path

    '''
    TODO: tune this model.
    '''
    model = keras.models.Sequential([
      keras.layers.Dense(
        256, # (len(self.features) * self.history_window_size) ** 2,
        input_shape=(len(self.features) * self.history_window_size,),
        activation=keras.activations.relu
      ),
      keras.layers.Dense(
        len(self.features) * self.forecast_window_size
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

    latest_ckpt = tf.train.latest_checkpoint(self.checkpoint_dir_path)
    if latest_ckpt is not None:
      match = re.search(r'\d+', Path(latest_ckpt).name)
      if match is not None:
        self.__last_epoch = int(match[0])

        model.load_weights(latest_ckpt)
        logging.info(f'Load checkpoint from {latest_ckpt}')

        std_path = Path(self.checkpoint_dir_path) / 'standardize_params.npz'
        arrs = np.load(std_path)
        self.__mean = np.float_(arrs['mean'])
        self.__stddev = np.float_(arrs['stddev'])

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
      df = self.__load_dataframe(path)
      self.__mean = df.drop(['start_time', 'end_time'], axis=1).values.mean()
      self.__stddev = df.drop(['start_time', 'end_time'], axis=1).values.std()
      std_path = Path(self.checkpoint_dir_path) / 'standardize_params.npz'
      std_path.parent.mkdir(parents=True, exist_ok=True)
      np.savez(
        std_path,
        mean=self.__mean,
        stddev=self.__stddev
      )

    ds = self.__load_dataset(path)
    # Use the first 30 days as the validation set
    train_ds = ds.skip(30 * 24 * 2).shuffle(10000).batch(128).repeat()
    val_ds = ds.take(30 * 24 * 2).batch(128).repeat()

    callbacks = []
    callbacks.append(keras.callbacks.ModelCheckpoint(
      filepath=os.path.join(self.checkpoint_dir_path, 'checkpoint-{epoch:04d}'),
      verbose=1,
      save_weights_only=True
    ))
    if self.log_dir_path is not None:
      callbacks.append(keras.callbacks.TensorBoard(self.log_dir_path))

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
    if self.log_dir_path is not None:
      callbacks.append(keras.callbacks.TensorBoard(self.log_dir_path))

    result = self.__model.evaluate(
      eval_ds,
      callbacks=callbacks
    )

    if show_ui:
      self.__visualize_examples(path, 'evaluation')

    return result

  def predict(self, history_batch: Any) -> Any:
    X_batch = np.vstack([
      np.vstack([
        history[feature]
        for feature in self.features
      ]).reshape((-1,))
      for history in history_batch
    ])
    X_batch = (X_batch - self.__mean) / self.__stddev

    predictions = self.__model.predict(X_batch)
    predictions = predictions * self.__stddev + self.__mean

    def iter_forecast() -> Any:
      for i in range(len(history_batch)):
        prediction = predictions[i].reshape((len(self.features), self.forecast_window_size))
        yield {
          feature: prediction[f]
          for f, feature in enumerate(self.features)
        }
    return list(iter_forecast())

  def predict_json(self, history_json: Any) -> Any:
    missing_features = set(self.features) - set(history_json['features'])
    unknown_features = set(history_json['features']) - set(self.features)
    if len(missing_features) > 0:
      raise MissingFeautureException(missing_features)
    if len(unknown_features) > 0:
      raise UnknownFeautureException(unknown_features)

    history = {
      feature: np.array(history_json['values'][f], dtype=np.int32)
      for f, feature in enumerate(history_json['features'])
    }
    history = {
      feature: history[feature]
      for feature in self.features
    }

    forecast = self.predict([history])[0]

    # fig = plt.figure()
    # axs = fig.subplots(ceil(len(interested_features) / 2), 2).flatten()
    # self.__visualize_example(axs, history, None, forecast)
    # fig.tight_layout()
    # plt.show()

    forecast_json = {
      'features': history_json['features'],
      'values': [
        forecast[feature].tolist()
        for feature in history_json['features']
      ]
    }
    return forecast_json

  def __load_dataframe(self, path: str) -> pd.DataFrame:
    with open(path) as file:
      data = json.load(file)
    df = pd.DataFrame({
      feature: pd.Series(data['values'][f], dtype=np.int32)
      for f, feature in enumerate(data['features'])
    })
    df['start_time'] = pd.Series(
      [datetime.fromisoformat(start_time) for start_time in data['startTimes']],
      dtype=pd.DatetimeTZDtype(tz=hk_timezone)
    )
    df['end_time'] = pd.Series(
      [datetime.fromisoformat(end_time) for end_time in data['endTimes']],
      dtype=pd.DatetimeTZDtype(tz=hk_timezone)
    )
    assert df.notna().all(None)

    df = df[['start_time', 'end_time', *self.features]]
    return df

  def __load_dataset(self, path: str) -> Any:
    df = self.__load_dataframe(path)

    ds = tf.data.Dataset.from_tensor_slices({
      feature: df[feature].to_numpy()
      for feature in self.features
    })
    ds = ds.map(lambda xs: {
      name: (x - self.__mean) / self.__stddev
      for name, x in xs.items()
    })
    ds = ds.window(size=self.history_window_size + self.forecast_window_size, shift=self.window_shift, drop_remainder=True)
    ds = ds.flat_map(lambda dsd: tf.data.Dataset.zip({
      name: sub_vals.batch(self.history_window_size + self.forecast_window_size).map(lambda x: tf.reshape(x, [self.history_window_size + self.forecast_window_size]))
      for name, sub_vals in dsd.items()
    }))
    ds = ds.map(lambda xs: {
      name: (x[:-self.forecast_window_size], x[-self.forecast_window_size:])
      for name, x in xs.items()
    })
    ds = ds.map(lambda xys: (
      tf.reshape(tf.stack([xys[feature][0] for feature in self.features]), shape=(-1,)), # Flatten to 1D array
      tf.reshape(tf.stack([xys[feature][1] for feature in self.features]), shape=(-1,))
    ))
    return ds

  def __visualize_examples(self, path: str, subtitle: str) -> None:
    df = self.__load_dataframe(path)

    history_batch = []
    label_batch = []
    for time in self.interested_times:
      start_idx = df[df['end_time'] == time].index[0]
      history_batch.append(df.iloc[start_idx - self.history_window_size + 1 : start_idx + 1, :]) # including end
      label_batch.append(df.iloc[start_idx + 1 : start_idx + self.forecast_window_size + 1, :])

    forecast_batch = self.predict(history_batch)

    for i, (time, history, label, forecast) in enumerate(zip(self.interested_times, history_batch, label_batch, forecast_batch)):
      fig = plt.figure()
      fig.suptitle(f'{time.isoformat()} ({i + 1}/{len(self.interested_times)}, {subtitle})')
      axs = fig.subplots(ceil(len(self.interested_features) / 2), 2).flatten()
      self.__visualize_example(axs, history, label, forecast)
      fig.tight_layout()
      plt.show()

  def __visualize_example(self, axs: Iterable[plt.Axes], history: Any, label: Any, forecast: Any) -> None:
    for feature, ax in zip(self.interested_features, axs):
      ax.set_title(f'{feature}')

      feature_history = history[feature]
      ax.plot(
        np.arange(-feature_history.shape[0] * 0.5 + 0.5, 0.5, 0.5),
        feature_history,
        label='history'
      )

      feature_forecast = forecast[feature]
      ax.plot(
        np.arange(0.5, feature_forecast.shape[0] * 0.5 + 0.5, 0.5),
        feature_forecast,
        label='forecast',
        marker='x',
        alpha=0.4
      )

      if label is not None:
        feature_label = label[feature]
        ax.plot(
          np.arange(0.5, feature_forecast.shape[0] * 0.5 + 0.5, 0.5),
          feature_label,
          label='label',
          marker='o',
          alpha=0.4
        )

      ax.grid(True)
      ax.legend()
