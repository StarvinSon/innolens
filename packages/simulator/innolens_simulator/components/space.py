from __future__ import annotations

from datetime import datetime
from typing import Tuple, Sequence, MutableSequence, Any, Optional, Union
from typing_extensions import Final

from ..object import Object
from ..engine import Engine
from ..component import Component
from .member import MemberComponent


class SpaceComponent(Component):

  @staticmethod
  def find(obj: Union[Object, Component], name: str) -> Optional[SpaceComponent]:
    if isinstance(obj, Component):
      obj = obj.attached_object

    for comp in obj.find_components(SpaceComponent, recursive=True):
      if comp.name == name:
        return comp
    return None

  name: str
  __log: Final[MutableSequence[Tuple[datetime, str, str]]]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__log = []

  @property
  def log(self) -> Sequence[Tuple[datetime, str, str]]:
    return self.__log

  def _on_late_init(self) -> None:
    assert hasattr(self, 'name')

  def enter(self, member: MemberComponent) -> None:
    self.__log.append((self.engine.clock.current_time, member.member_id, 'enter'))

  def exit(self, member: MemberComponent) -> None:
    self.__log.append((self.engine.clock.current_time, member.member_id, 'exit'))
