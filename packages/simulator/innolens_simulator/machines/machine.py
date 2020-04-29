from __future__ import annotations

from datetime import datetime
from typing import Tuple, Sequence, MutableSequence, ClassVar
from typing_extensions import Final

from ..engine.object import Object
from ..engine.component import Component
from ..users.member import Member


class Machine(Component):
  type_id: ClassVar[str] = ''
  type_name: ClassVar[str] = ''

  instance_id: str = ''
  instance_name: str = ''

  __in_use: bool
  __log: Final[MutableSequence[Tuple[datetime, str, str]]]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__in_use = False
    self.__log = []

  @property
  def in_use(self) -> bool:
    return self.__in_use

  @property
  def log(self) -> Sequence[Tuple[datetime, str, str]]:
    return self.__log

  def _on_late_init(self) -> None:
    assert self.type_id != ''
    assert self.type_name != ''
    assert self.instance_id != ''
    if self.instance_name == '':
      self.instance_name = f'{self.type_name} {self.instance_id}'

  def acquire(self, member: Member) -> None:
    if self.__in_use:
      raise Exception(f'{self.type_name} {self.instance_name} is already in use')
    self.__in_use = True
    self.__log.append((self.engine.clock.current_time, member.member_id, 'acquire'))

  def release(self, member: Member) -> None:
    if not self.__in_use:
      raise Exception(f'{self.type_name} {self.instance_name} is not in use')
    self.__in_use = False
    self.__log.append((self.engine.clock.current_time, member.member_id, 'release'))
