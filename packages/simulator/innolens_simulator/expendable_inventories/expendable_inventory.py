from __future__ import annotations

from datetime import datetime
from typing import Tuple, Sequence, MutableSequence, ClassVar
from typing_extensions import Final

from ..engine.object import Object
from ..engine.component import Component
from ..users.member import Member


class ExpendableInventory(Component):
  type_id: ClassVar[str] = ''
  type_name: ClassVar[str] = ''

  __quantity_set_log: Final[MutableSequence[Tuple[datetime, int]]]
  __access_log: Final[MutableSequence[Tuple[datetime, str, int]]]

  __quantity: int

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__quantity_set_log = []
    self.__access_log = []
    self.__quantity = 0

  @property
  def quantity_set_log(self) -> Sequence[Tuple[datetime, int]]:
    return self.__quantity_set_log

  @property
  def access_log(self) -> Sequence[Tuple[datetime, str, int]]:
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
    self.__quantity_set_log.append((self.engine.clock.current_time, quantity))
    self.__quantity = quantity

  def acquire(self, member: Member, quantity: int) -> None:
    if quantity > self.__quantity:
      raise ValueError(f'Expendable inventory {self.type_name} overdrawn')
    if quantity == 0:
      raise ValueError('quantity must be > 0')
    self.__access_log.append((self.engine.clock.current_time, member.member_id, quantity))
    self.__quantity -= quantity
