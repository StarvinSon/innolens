from __future__ import annotations

from datetime import datetime
from typing import Tuple, Sequence, MutableSequence, ClassVar
from typing_extensions import Final

from ..engine.object import Object
from ..engine.component import Component
from ..users.member import Member


class Space(Component):
  space_id: ClassVar[str] = ''
  space_name: ClassVar[str] = ''
  space_capacity: ClassVar[int] = 40

  __log: Final[MutableSequence[Tuple[datetime, str, str]]]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__log = []

  @property
  def log(self) -> Sequence[Tuple[datetime, str, str]]:
    return self.__log

  def _on_late_init(self) -> None:
    assert self.space_id != ''
    assert self.space_name != ''

  def enter(self, member: Member) -> None:
    self.__log.append((self.engine.clock.current_time, member.member_id, 'enter'))

  def exit(self, member: Member) -> None:
    self.__log.append((self.engine.clock.current_time, member.member_id, 'exit'))
