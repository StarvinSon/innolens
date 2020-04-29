from __future__ import annotations

from argparse import ArgumentParser, Namespace
import json
from pprint import pprint
from typing_extensions import Final

from ...cli import Cli


class MemberClusterCli(Cli):
  name: Final[str] = 'member_cluster'

  def configure_parser(self, parser: ArgumentParser) -> None:
    subparsers = parser.add_subparsers(
      title='actions',
      required=True,
      dest='action'
    )
    for sub_cli in (
      MemberClusterClusterCli(),
    ):
      subparser = subparsers.add_parser(name=sub_cli.name)
      sub_cli.configure_parser(subparser)
      subparser.set_defaults(_MemberClusterCli__handler=sub_cli.handle)

  def handle(self, args: Namespace) -> None:
    args._MemberClusterCli__handler(args)

class MemberClusterClusterCli(Cli):
  name: Final[str] = 'cluster'

  def configure_parser(self, parser: ArgumentParser) -> None:
    parser.add_argument(
      '--data',
      required=True
    )
    parser.add_argument(
      '--ui',
      action='store_true',
      help='Show the dendrogram after clustering'
    )

  def handle(self, args: Namespace) -> None:
    data_path: str = args.data
    show_ui: bool = args.ui

    with open(data_path) as file:
      data = json.load(file)

    from .model import MemberClusterModel
    model = MemberClusterModel()

    result = model.cluster_json(data, show_ui=show_ui)
    pprint(result)
