from __future__ import annotations

from argparse import ArgumentParser, Namespace
from typing_extensions import Final

from ..cli import Cli


class ServerCli(Cli):
  name: Final[str] = 'serve'

  def configure_parser(self, parser: ArgumentParser) -> None:
    parser.add_argument(
      '--forecast-checkpoint-dir',
      help='The dir storing the forecast model checkpoints',
      required=True
    )
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
    forecast_checkpoint_dir_path: str = args.forecast_checkpoint_dir
    port: int = args.port
    debug: bool = args.debug

    from .app import create_app
    app = create_app(forecast_chkpt_dir_path=forecast_checkpoint_dir_path)
    app.run(port=port, debug=debug)
