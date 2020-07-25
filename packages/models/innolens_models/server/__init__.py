from __future__ import annotations

from argparse import ArgumentParser, Namespace
from typing_extensions import Final
from pathlib import Path

from ..cli import Cli


checkpoints_path: Final = Path(__file__).parent.parent.parent / 'checkpoints'

class ServerCli(Cli):
  name: Final[str] = 'serve'

  def configure_parser(self, parser: ArgumentParser) -> None:
    parser.add_argument(
      '--history-forecast-checkpoint-dir',
      help='The dir storing the history forecast model checkpoints',
      default=str(checkpoints_path / 'history_forecast')
    )
    parser.add_argument(
      '--access-causality-checkpoint-dir',
      help='The dir storing the access causality model checkpoints',
      default=str(checkpoints_path / 'access_causality')
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
    history_forecast_checkpoint_dir_path: str = args.history_forecast_checkpoint_dir
    access_causality_checkpoint_dir_path: str = args.access_causality_checkpoint_dir
    port: int = args.port
    debug: bool = args.debug

    from .app import create_app
    app = create_app(
      history_forecast_chkpt_dir_path=history_forecast_checkpoint_dir_path,
      access_causality_chkpt_dir_path=access_causality_checkpoint_dir_path
    )
    app.run(host='0.0.0.0', port=port, debug=debug)
