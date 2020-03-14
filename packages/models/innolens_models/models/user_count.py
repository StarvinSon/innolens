from __future__ import annotations

from argparse import ArgumentParser, Namespace
from datetime import datetime, timedelta, timezone
from typing import MutableSequence, Iterator, Mapping, Any, Optional, Iterable, Iterator, Sequence, Callable, TypeVar
from typing_extensions import Final
from pathlib import Path
from logging import INFO
from pprint import pprint
from math import floor

import numpy as np
import tensorflow as tf
import pandas as pd

from innolens_models.cli import Cli
from innolens_models.models.utils.estimator_metrics import to_estimator_metrics


class UserCountCli(Cli):
  name: Final[str] = 'user_count'

  def configure_parser(self, parser: ArgumentParser) -> None:
    subparsers = parser.add_subparsers(
      title='actions',
      required=True,
      dest='action'
    )
    for sub_cli in (
      UserCountPreprocessorCli(),
      UserCountModelTrainingCli(),
      UserCountModelEvaluationCli()
    ):
      subparser = subparsers.add_parser(name=sub_cli.name)
      sub_cli.configure_parser(subparser)
      subparser.set_defaults(_UserCountCli__handler=sub_cli.handle)

  def handle(self, args: Namespace) -> None:
    args._UserCountCli__handler(args)

class UserCountPreprocessorCli(Cli):
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
      '--member-data',
      help='Path to the member data csv',
      required=True
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
      '--category-length',
      help='Path to the csv storing how many departments and affiliated student interest groups there are',
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
      '--is-space',
      help='Whether the access records belongs to a space or something else',
      action="store_true"
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
    is_space: bool = args.is_space
    member_data_path: str = args.member_data
    training_data_path: str = args.training_data
    evaluation_data_path: str = args.evaluation_data
    category_length_path: str = args.category_length
    start_time: datetime = args.start_time
    end_time: datetime = args.end_time
    time_step: timedelta = args.time_step
    evaluation_fraction: Optional[float] = args.evaluation_fraction

    preprocess(
      input_path=input_path,
      is_space=is_space,
      member_data_path=member_data_path,
      training_data_path=training_data_path,
      evaluation_data_path=evaluation_data_path,
      category_length_path=category_length_path,
      start_time=start_time,
      end_time=end_time,
      time_step=time_step,
      evaluation_fraction=evaluation_fraction
    )

class UserCountModelTrainingCli(Cli):
  name: Final[str] = 'train'

  def configure_parser(self, parser: ArgumentParser) -> None:
    parser.add_argument(
      '--model-dir',
      help='The dir storing the model internal data',
      required=True
    )
    parser.add_argument(
      '--training-data',
      help='Path to the training data csv',
      required=True
    )
    parser.add_argument(
      '--category-length',
      help='Path to the csv storing how many departments and affiliated student interest groups there are',
      required=True
    )
    parser.add_argument(
      '--learning-rate',
      help='The learning rate for training',
      type=int
    )
    # parser.add_argument(
    #   '--l1',
    #   help='L1 regularization parameter',
    #   type=float
    # )
    # parser.add_argument(
    #   '--l2',
    #   help='L2 regularization parameter',
    #   type=float
    # )
    parser.add_argument(
      '--steps',
      help='Number of steps for training',
      type=int
    )
    parser.add_argument(
      '--log-steps',
      help='Number of step between each log during training',
      type=int
    )
    parser.add_argument(
      '--evaluation-data',
      help='Path to the evaluation data csv'
    )
    parser.add_argument(
      '--evaluation-prediction',
      help='Path to the evaluation prediction csv'
    )

  def handle(self, args: Namespace) -> None:
    model_dir_path: str = args.model_dir
    category_length_path: str = args.category_length
    training_data_path: str = args.training_data
    learning_rate: Optional[int] = args.learning_rate
    # l1: Optional[float] = args.l1
    # l2: Optional[float] = args.l2
    steps: Optional[int] = args.steps
    log_steps: Optional[int] = args.log_steps
    evaluation_data_path: Optional[str] = args.evaluation_data
    evaluation_prediction_path: Optional[str] = args.evaluation_prediction

    train_or_evaluate_model(
      model_dir_path=model_dir_path,
      category_length_path=category_length_path,
      training_data_path=training_data_path,
      training_learning_rate=learning_rate,
      # training_l1=l1,
      # training_l2=l2,
      training_steps=steps,
      training_log_steps=log_steps,
      evaluation_data_path=evaluation_data_path,
      evaluation_prediction_path=evaluation_prediction_path
    )

class UserCountModelEvaluationCli(Cli):
  name: Final[str] = 'evaluate'

  def configure_parser(self, parser: ArgumentParser) -> None:
    parser.add_argument(
      '--model-dir',
      help='The dir storing the model internal data',
      required=True
    )
    parser.add_argument(
      '--data',
      help='Path to the training data csv',
      required=True
    )
    parser.add_argument(
      '--category-length',
      help='Path to the csv storing how many departments and affiliated student interest groups there are',
      required=True
    )
    parser.add_argument(
      '--prediction',
      help='Path to the prediction csv'
    )

  def handle(self, args: Namespace) -> None:
    model_dir_path: str = args.model_dir
    category_length_path: str = args.category_length
    data_path: str = args.data
    prediction_path: Optional[str] = args.prediction

    train_or_evaluate_model(
      model_dir_path=model_dir_path,
      category_length_path=category_length_path,
      evaluation_data_path=data_path,
      evaluation_prediction_path=prediction_path
    )


def preprocess(
  input_path: str,
  is_space: bool,
  member_data_path:str,
  training_data_path: str,
  evaluation_data_path: str,
  category_length_path: str,
  start_time: datetime,
  end_time: datetime,
  time_step: timedelta,
  evaluation_fraction: Optional[float] = None
) -> None:
  departments: MutableSequence[str] = []
  types_of_study = [
    'Undergraduate',
    'Taught Postgraduate',
    'Research Postgraduate'
  ]
  study_programmes = ['JS6963', 'JS6951', 'JS6925', 'JS6248']
  years_of_study = [1, 2, 3, 4, 5, 6]
  affiliated_student_interest_groups: MutableSequence[str] = []

  if evaluation_fraction is None:
    evaluation_fraction = 0.2

  def generate_member_groups() -> pd.DataFrame:
    index = pd.MultiIndex.from_product([
      departments,
      types_of_study,
      study_programmes,
      years_of_study,
      affiliated_student_interest_groups
    ], names = ['Department', 'Type of Study', 'Study Programme', 'Year of Study', 'Affiliated Student Interest Group'])
    return pd.DataFrame(index = index).reset_index()

  def load_member_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(
      path,
      dtype={
        'UID': str,
        'Name': str,
        'Department': str,
        'Type of Study': pd.CategoricalDtype(types_of_study),
        'Study Programme': pd.CategoricalDtype(study_programmes),
        'Year of Study': pd.CategoricalDtype(years_of_study),
        'Affiliated Student Interest Group': str,
      }
    )
    assert df.columns.to_list() == [
      'UID',
      'Name',
      'Department',
      'Type of Study',
      'Study Programme',
      'Year of Study',
      'Affiliated Student Interest Group'
    ]
    return df

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

  def iterate_spans(
    df: pd.DataFrame,
    member_df: pd.DataFrame,
    start_time: pd.Timestamp,
    end_time: pd.Timestamp,
    time_step: pd.Timedelta
  ) -> Iterator[Mapping[str, Any]]:
    df = df.sort_values('Time')
    df = pd.merge(df, member_df, on='UID')

    staying_uids = {}
    for _, row in df.iterrows():
      time = row['Time']
      uid = row['UID']
      department = row['Department']
      type_of_study = row['Type of Study']
      study_programme = row['Study Programme']
      year_of_study = row['Year of Study']
      affiliated_student_interest_group = row['Affiliated Student Interest Group']
      action = row['Action']

      if department not in departments:
        departments.append(department)
      if affiliated_student_interest_group not in affiliated_student_interest_groups:
        affiliated_student_interest_groups.append(affiliated_student_interest_group)

      if action == 'enter' or action == 'acquire':
        staying_uids[uid] = time
      elif action == 'exit' or action == 'release':
        enter_time = staying_uids.get(uid)
        if enter_time is not None:
          if enter_time < time:
            yield {
              'Enter Time': enter_time,
              'Exit Time': time,
              'UID': uid,
              'Department': department,
              'Type of Study': type_of_study,
              'Study Programme': study_programme,
              'Year of Study': year_of_study,
              'Affiliated Student Interest Group': affiliated_student_interest_group
            }
          del staying_uids[uid]

  def iterate_rows(
    spans: Sequence[Mapping[str, Any]],
    start_time: pd.Timestamp,
    end_time: pd.Timestamp,
    time_step: pd.Timedelta
  ) -> Iterator[Mapping[str, Any]]:

    def time_components(prefix: str, time: pd.Timestamp) -> Mapping[str, Any]:
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

      while i < len(spans) and spans[i]['Enter Time'] < period_end_time:
        if spans[i]['Exit Time'] > period_start_time:
          curr_spans.append(spans[i])
        i += 1

      groups = generate_member_groups()
      for _, row in groups.iterrows():
        department = row['Department']
        type_of_study = row['Type of Study']
        study_programme = row['Study Programme']
        year_of_study = row['Year of Study']
        affiliated_student_interest_group = row['Affiliated Student Interest Group']

        filtered_span = [span for span in curr_spans if (
          span['Department'] == department and
          span['Type of Study'] == type_of_study and
          span['Study Programme'] == study_programme and
          span['Year of Study'] == year_of_study and
          span['Affiliated Student Interest Group'] == affiliated_student_interest_group
        )]

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
          **time_components('start_time', period_start_time),
          **time_components('end_time', period_end_time),
          'department': department,
          'type_of_study': type_of_study,
          'study_programme': study_programme,
          'year_of_study': year_of_study,
          'affiliated_student_interest_group': affiliated_student_interest_group,
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
        if span['Exit Time'] > period_end_time
      ]
      period_start_time = period_end_time
      period_end_time = period_start_time + time_step

  def to_data_frame(rows: Sequence[Mapping[str, Any]]) -> pd.DataFrame:

    def time_columns(prefix: str) -> Mapping[str, Any]:
      return {
        prefix: pd.DatetimeTZDtype(tz=timezone(timedelta(hours=8))),
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
        'department': pd.CategoricalDtype(departments),
        'type_of_study': pd.CategoricalDtype(types_of_study),
        'study_programme': pd.CategoricalDtype(study_programmes),
        'year_of_study': pd.CategoricalDtype(years_of_study),
        'affiliated_student_interest_group': pd.CategoricalDtype(affiliated_student_interest_groups),
        'enter_count': np.uint16,
        'unique_enter_count': np.uint16,
        'exit_count': np.uint16,
        'unique_exit_count': np.uint16,
        'stay_count': np.uint16,
        'unique_stay_count': np.uint16
      }.items()
    })

  member_df = load_member_data(member_data_path)
  input_df = load_access_records(input_path)
  spans = list(iterate_spans(
    df=input_df,
    member_df=member_df,
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

  evaluation_start_idx = floor(df.shape[0] * (1 - evaluation_fraction))
  training_df = df.iloc[:evaluation_start_idx]
  evaluation_df = df.iloc[evaluation_start_idx:]
  category_length_df = pd.DataFrame({'feature': ['department', 'affiliated_student_interest_group'], 'category_length': [len(departments), len(affiliated_student_interest_groups)]})

  for output_path, output_df in {
    training_data_path: training_df,
    evaluation_data_path: evaluation_df,
    category_length_path: category_length_df
  }.items():
    output_path_obj = Path(output_path).resolve(strict=False)
    output_path_obj.parent.mkdir(parents=True, exist_ok=True)
    output_df.to_csv(str(output_path_obj), index=False)

def train_or_evaluate_model(
  *,
  model_dir_path: str,
  category_length_path: str,
  training_data_path: Optional[str] = None,
  training_learning_rate: Optional[int] = None,
  # training_l1: Optional[float] = None,
  # training_l2: Optional[float] = None,
  training_steps: Optional[int] = None,
  training_log_steps: Optional[int] = None,
  evaluation_data_path: Optional[str] = None,
  evaluation_prediction_path: Optional[str] = None
) -> None:
  tf.get_logger().setLevel(INFO)

  model = UserCountModel(
    model_dir_path=model_dir_path,
    category_length_path=category_length_path,
    learning_rate=training_learning_rate,
    # l1=training_l1,
    # l2=training_l2,
    log_steps=training_log_steps
  )

  if training_data_path is not None:
    model.train(training_data_path, steps=training_steps)

  if evaluation_data_path is not None:
    result = model.evaluate(evaluation_data_path, dataset=evaluation_prediction_path is not None)
    if 'dataset' in result:
      df = pd.DataFrame.from_records(result['dataset'].as_numpy_iterator())
      df.to_csv(evaluation_prediction_path, index=False)
    pprint(result['metrics'])

class UserCountModel:
  __tf_model: Final[Any]

  def __init__(
    self,
    *,
    model_dir_path: str,
    category_length_path:str,
    learning_rate: Optional[float] = None,
    # l1: Optional[float] = None,
    # l2: Optional[float] = None,
    log_steps: Optional[int] = None
  ):
    super().__init__()

    if learning_rate is None:
      learning_rate = 0.001
    # if l1 is None:
    #   l1 = 0.0
    # if l2 is None:
    #   l2 = 0.0
    if log_steps is None:
      log_steps = 100

    category_length = pd.read_csv(
      category_length_path,
      dtype={
        'feature': str,
        'category_length': np.uint16,
      }
    )
    assert category_length.columns.to_list() == [
      'feature',
      'category_length'
    ]

    weekday_feature_column = tf.feature_column.categorical_column_with_identity(
      key='start_time_weekday',
      num_buckets=7
    )
    hour_feature_column = tf.feature_column.categorical_column_with_identity(
      key='start_time_hour',
      num_buckets=24
    )
    minute_feature_column = tf.feature_column.categorical_column_with_vocabulary_list(
      key='start_time_minute',
      vocabulary_list=[0, 30],
      num_oov_buckets=0
    )
    department_feature_column = tf.feature_column.categorical_column_with_hash_bucket(
      key='department',
      hash_bucket_size=category_length.loc[category_length['feature'] == 'department']['category_length'].to_list()[0]
    )
    type_of_study_feature_column = tf.feature_column.categorical_column_with_hash_bucket(
      key='type_of_study',
      hash_bucket_size=3
    )
    study_programme_feature_column = tf.feature_column.categorical_column_with_hash_bucket(
      key='study_programme',
      hash_bucket_size=4
    )
    year_of_study_feature_column = tf.feature_column.categorical_column_with_identity(
      key='year_of_study',
      num_buckets=6
    )
    affiliated_student_interest_group_feature_column = tf.feature_column.categorical_column_with_hash_bucket(
      key='affiliated_student_interest_group',
      hash_bucket_size=category_length.loc[category_length['feature'] == 'affiliated_student_interest_group']['category_length'].to_list()[0]
    )
    # crossed_column = tf.feature_column.crossed_column(
    #   keys=(weekday_feature_column, hour_feature_column, minute_feature_column),
    #   hash_bucket_size=1000
    # )

    model = tf.estimator.DNNRegressor(
      hidden_units=[128], # TODO: tune hidden layer
      feature_columns=(
        tf.feature_column.indicator_column(weekday_feature_column),
        tf.feature_column.indicator_column(hour_feature_column),
        tf.feature_column.indicator_column(minute_feature_column),
        tf.feature_column.indicator_column(department_feature_column),
        tf.feature_column.indicator_column(type_of_study_feature_column),
        tf.feature_column.indicator_column(study_programme_feature_column),
        tf.feature_column.indicator_column(year_of_study_feature_column),
        tf.feature_column.indicator_column(affiliated_student_interest_group_feature_column),
        # crossed_column,
      ),
      model_dir=model_dir_path,
      # weight_column=FEATURE_KEY_LABEL_WEIGHT,
      optimizer=tf.keras.optimizers.Adam(
        learning_rate=learning_rate
      ),
      config=tf.estimator.RunConfig(
        log_step_count_steps=log_steps
      )
    )

    for name, keras_metrics_factory in {
      'mse': tf.keras.metrics.MeanSquaredError,
      'rmse': tf.keras.metrics.RootMeanSquaredError,
      'mae': tf.keras.metrics.MeanAbsoluteError
    }.items():
      model = tf.estimator.add_metrics(model, to_estimator_metrics(name, keras_metrics_factory))

    self.__tf_model = model

  def train(self, path: str, *, steps: Optional[int] = None) -> None:
    if steps is None:
      steps = 10000

    input_fn = lambda: self.__to_training_dataset(self.__load_dataset(path))
    self.__tf_model.train(
      input_fn=input_fn,
      steps=steps
    )

  def evaluate(self, path: str, *, dataset: bool = False) -> Any:
    input_fn = lambda: self.__to_evaluation_dataset(self.__load_dataset(path))
    metrics = self.__tf_model.evaluate(
      input_fn=input_fn
    )
    result = { 'metrics': metrics }

    if dataset:
      def generate() -> Iterator[Any]:
        ds = self.__load_dataset(path)

        input_fn = lambda: self.__to_evaluation_dataset(self.__load_dataset(path))
        predictions = self.__tf_model.predict(input_fn=input_fn)

        for (features, label), prediction in zip(ds, predictions):
          yield {
            **features,
            'label': label,
            'prediction': prediction['predictions'][0]
          }

      result['dataset'] = tf.data.Dataset.from_generator(
        generate,
        {
          'start_time_weekday': tf.int32,
          'start_time_hour': tf.int32,
          'start_time_minute': tf.int32,
          'department': tf.string,
          'type_of_study': tf.string,
          'study_programme': tf.string,
          'year_of_study': tf.int32,
          'affiliated_student_interest_group': tf.string,
          'label': tf.int32,
          'prediction': tf.float32
        },
        {
          'start_time_weekday': tf.TensorShape([]),
          'start_time_hour': tf.TensorShape([]),
          'start_time_minute': tf.TensorShape([]),
          'department': tf.TensorShape([]),
          'type_of_study': tf.TensorShape([]),
          'study_programme': tf.TensorShape([]),
          'year_of_study': tf.TensorShape([]),
          'affiliated_student_interest_group': tf.TensorShape([]),
          'label': tf.TensorShape([]),
          'prediction': tf.TensorShape([])
        }
      )

    return result

  def __load_dataset(self, path: str) -> Any:
    return tf.data.experimental.make_csv_dataset(
      file_pattern=path,
      header=True,
      select_columns=[
        'start_time_weekday',
        'start_time_hour',
        'start_time_minute',
        'department',
        'type_of_study',
        'study_programme',
        'year_of_study',
        'affiliated_student_interest_group',
        'unique_stay_count'
      ],
      column_defaults=[tf.int32, tf.int32, tf.int32, tf.string, tf.string, tf.string, tf.int32, tf.string, tf.int32],
      label_name='unique_stay_count',
      shuffle=False,
      batch_size=1,
      num_epochs=1
    ).unbatch()

  def __to_training_dataset(self, ds: Any) -> Any:
    return ds.shuffle(2000).batch(100).repeat()

  def __to_evaluation_dataset(self, ds: Any) -> Any:
    return ds.batch(100)
