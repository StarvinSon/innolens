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
    for sub_cli in (
      HistoryClusterModelServerCli(),
    ):
      subparser = subparsers.add_parser(name=sub_cli.name)
      sub_cli.configure_parser(subparser)
      subparser.set_defaults(_HistoryClusterCli__handler=sub_cli.handle)

  def handle(self, args: Namespace) -> None:
    args._HistoryClusterCli__handler(args)

class HistoryClusterModelServerCli(Cli):
  name: Final[str] = 'serve'

  def configure_parser(self, parser: ArgumentParser) -> None:
    parser.add_argument(
      '--port',
      type=int,
      default=5000,
      help='The port the server listens to'
    )
    parser.add_argument(
      '--debug',
      action='store_true',
      help='Whether to enable Flask debug mode'
    )

  def handle(self, args: Namespace) -> None:
    port: int = args.port
    debug: bool = args.debug

    from .server import create_app
    app = create_app()
    app.run(port=port, debug=debug)
