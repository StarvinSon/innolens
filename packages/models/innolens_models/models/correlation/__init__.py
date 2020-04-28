from __future__ import annotations

from argparse import ArgumentParser, Namespace
from typing_extensions import Final

from ...cli import Cli

class CorrelationCli(Cli):
  name: Final[str] = 'correlation'

  def configure_parser(self, parser: ArgumentParser) -> None:
    subparsers = parser.add_subparsers(
      title='actions',
      required=True,
      dest='action'
    )
    for sub_cli in ( # type: ignore
      # CorrelationModelServerCli(),
    ):
      subparser = subparsers.add_parser(name=sub_cli.name) # type: ignore
      sub_cli.configure_parser(subparser) # type: ignore
      subparser.set_defaults(_CorrelationCli__handler=sub_cli.handle) # type: ignore

  def handle(self, args: Namespace) -> None:
    args._CorrelationCli__handler(args)
