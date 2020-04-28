from __future__ import annotations

from datetime import datetime
from typing import Tuple, Sequence, MutableSequence, ClassVar
from typing_extensions import Literal
from typing_extensions import Final

from ..engine.object import Object
from ..engine.component import Component
from ..users.member import Member


class ExpendableInventory(Component):
  type_id: ClassVar[str] = ''
  type_name: ClassVar[str] = ''
  type_capacity: ClassVar[int] = 100

  __access_log: Final[MutableSequence[Tuple[Literal['set', 'take'], datetime, int, str, int]]]
  '''
  action, time, quantity, memberId, take_quantity
  For action=set: 'set', time, quantity, '', -1
  for action=take: 'take', time, -1, member_id, take_quantity
  '''

  __quantity: int

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__access_log = []
    self.__quantity = 0

  @property
  def access_log(self) -> Sequence[Tuple[Literal['set', 'take'], datetime, int, str, int]]:
    return self.__access_log

  @property
  def quantity(self) -> int:
    return self.__quantity

  def _on_late_init(self) -> None:
    assert self.type_id != ''
    assert self.type_name != ''

  def set_quantity(self, quantity: int) -> None:
    if quantity < 0:
      raise ValueError(f'quantity must be >= 0, given {quantity}')
    self.__access_log.append(('set', self.engine.clock.current_time, quantity, '', -1))
    self.__quantity = quantity

  def acquire(self, member: Member, quantity: int) -> None:
    if quantity > self.__quantity:
      raise ValueError(f'Expendable inventory {self.type_name} overdrawn')
    if quantity == 0:
      raise ValueError('quantity must be > 0')
    self.__access_log.append(('take', self.engine.clock.current_time, -1, member.member_id, quantity))
    self.__quantity -= quantity
