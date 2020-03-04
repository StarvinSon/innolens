from __future__ import annotations

from datetime import datetime
from typing import Tuple, Sequence, MutableSequence, Any
from typing_extensions import Final

from innolens_simulator.object import Object
from innolens_simulator.engine import Engine
from innolens_simulator.component import Component
from innolens_simulator.components.member import MemberComponent


class SpaceComponentMixin(Component):
  __log: Final[MutableSequence[Tuple[datetime, str, str]]]

  def __init__(self, *args: Any, **kwargs: Any):
    super().__init__(*args, **kwargs)
    self.__log = []

  @property
  def log(self) -> Sequence[Tuple[datetime, str, str]]:
    return self.__log

  def enter(self, member: MemberComponent) -> None:
    self.__log.append((self.engine.clock.current_time, member.uid, 'enter'))

  def exit(self, member: MemberComponent) -> None:
    self.__log.append((self.engine.clock.current_time, member.uid, 'exit'))
