from __future__ import annotations

from argparse import ArgumentParser, Namespace
from datetime import timedelta, timezone
from typing import Optional
from typing_extensions import Final
from pathlib import Path

from ...cli import Cli


hk_timezone: Final = timezone(timedelta(hours=8))


class AccessCausalityCli(Cli):
  name: Final[str] = 'access_causality'

  def configure_parser(self, parser: ArgumentParser) -> None:
    subparsers = parser.add_subparsers(
      title='actions',
      required=True,
      dest='action'
    )
    for sub_cli in (
      AccessCausalityModelTrainingCli(),
    ):
      subparser = subparsers.add_parser(name=sub_cli.name)
      sub_cli.configure_parser(subparser)
      subparser.set_defaults(_AccessCausalityCli__handler=sub_cli.handle)

  def handle(self, args: Namespace) -> None:
    args._AccessCausalityCli__handler(args)

class AccessCausalityModelTrainingCli(Cli):
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
