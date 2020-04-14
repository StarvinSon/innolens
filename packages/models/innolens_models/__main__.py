from __future__ import annotations

from argparse import ArgumentParser

from .models.access_record import AccessRecordCli
from .models.user_count import UserCountCli
from .models.history_forecast import HistoryForecastCli


parser = ArgumentParser(
  prog='innolens_models',
  description='Models'
)
subparsers = parser.add_subparsers(
  title='models',
  required=True,
  dest='model_name'
)
for sub_cli in (
  AccessRecordCli(),
  UserCountCli(),
  HistoryForecastCli()
):
  subparser = subparsers.add_parser(name=sub_cli.name)
  sub_cli.configure_parser(subparser)
  subparser.set_defaults(__main__handler=sub_cli.handle)

args = parser.parse_args()
args.__main__handler(args)
