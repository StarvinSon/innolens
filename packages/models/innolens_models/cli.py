from __future__ import annotations

from abc import ABCMeta, abstractmethod
from argparse import ArgumentParser, Namespace


class Cli(metaclass=ABCMeta):

  @property
  @abstractmethod
  def name(self) -> str: ...

  @abstractmethod
  def configure_parser(self, parser: ArgumentParser) -> None: ...

  @abstractmethod
  def handle(self, args: Namespace) -> None: ...
