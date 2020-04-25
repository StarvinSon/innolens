from __future__ import annotations

from argparse import ArgumentParser, Namespace
from datetime import timedelta, timezone
from typing import Optional
from typing_extensions import Final
from pathlib import Path

from ...cli import Cli


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
      # HistoryForecastPreprocessorCli(),
      HistoryForecastModelTrainingCli(),
    ):
      subparser = subparsers.add_parser(name=sub_cli.name)
      sub_cli.configure_parser(subparser)
      subparser.set_defaults(_HistoryForecastCli__handler=sub_cli.handle)

  def handle(self, args: Namespace) -> None:
    args._HistoryForecastCli__handler(args)

# class HistoryForecastPreprocessorCli(Cli):
#   name: Final[str] = 'preprocess'

#   def configure_parser(self, parser: ArgumentParser) -> None:
#     T = TypeVar('T', bound=Callable[..., Any])
#     def rename(name: str, f: T) -> T:
#       f.__name__ = name
#       return f

#     parser.add_argument(
#       '--input',
#       help='Path to the input data csv',
#       required=True
#     )
#     parser.add_argument(
#       '--space',
#       help='Whether the access records belongs to a space or something else',
#       action="store_true"
#     )
#     parser.add_argument(
#       '--training-data',
#       help='Path to the training data csv',
#       required=True
#     )
#     parser.add_argument(
#       '--evaluation-data',
#       help='Path to the evaluation data csv',
#       required=True
#     )
#     parser.add_argument(
#       '--start-time',
#       help='Start time',
#       type=rename('datetime', lambda s: datetime.fromisoformat(s)),
#       required=True
#     )
#     parser.add_argument(
#       '--end-time',
#       help='End time',
#       type=rename('datetime', lambda s: datetime.fromisoformat(s)),
#       required=True
#     )

#   def handle(self, args: Namespace) -> None:
#     input_path: str = args.input
#     is_space: bool = args.space
#     training_data_path: str = args.training_data
#     evaluation_data_path: str = args.evaluation_data
#     start_time: datetime = args.start_time
#     end_time: datetime = args.end_time

#     from .preprocessor import preprocess
#     preprocess(
#       input_path=input_path,
#       is_space=is_space,
#       training_data_path=training_data_path,
#       evaluation_data_path=evaluation_data_path,
#       start_time=start_time,
#       end_time=end_time
#     )

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

    from .model import train_model
    train_model(
      checkpoint_dir_path=str(Path(checkpoint_dir_path)),
      training_data_path=None if training_data_path is None else str(Path(training_data_path)),
      evaluation_data_path=None if evaluation_data_path is None else str(Path(evaluation_data_path)),
      log_dir_path=None if log_dir_path is None else str(Path(log_dir_path)),
      show_ui=show_ui
    )
