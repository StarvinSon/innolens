from __future__ import annotations

from argparse import ArgumentParser, Namespace
from typing_extensions import Final

from ...cli import Cli

class HistoryClusterCli(Cli):
  name: Final[str] = 'history_cluster'

  def configure_parser(self, parser: ArgumentParser) -> None:
    subparsers = parser.add_subparsers(
      title='actions',
      required=True,
      dest='action'
    )
    for sub_cli in ( # type: ignore
      # HistoryClusterModelServerCli(),
    ):
      subparser = subparsers.add_parser(name=sub_cli.name) # type: ignore
      sub_cli.configure_parser(subparser) # type: ignore
      subparser.set_defaults(_HistoryClusterCli__handler=sub_cli.handle) # type: ignore

  def handle(self, args: Namespace) -> None:
    args._HistoryClusterCli__handler(args)
