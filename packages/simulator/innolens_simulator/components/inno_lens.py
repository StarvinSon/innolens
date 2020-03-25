from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Tuple

from ..component import Component
from .space import SpaceComponent
from .machine import MachineComponent
from .inventory import InventoryComponent
from .member import MemberComponent
from ..object import Object


class InnoLensComponent(Component):
  __inno_wing: SpaceComponent
  __member: MemberComponent
  __vr_gadget: InventoryComponent
  __staying_period: Optional[Tuple[datetime, datetime]]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__staying_period = None

  def _on_late_init(self) -> None:
    inno_wing = SpaceComponent.find(self.engine.world, 'Inno Wing')
    if inno_wing is None:
      raise ValueError('Cannot find Inno Wing space')
    self.__inno_wing = inno_wing

    vr_gadget = InventoryComponent.find(inno_wing.attached_object, 'VR gadget')
    if vr_gadget is None:
      raise ValueError('Cannot find vr gadget inventory')
    self.__vr_gadget = vr_gadget

    member = self.attached_object.find_component(MemberComponent)
    if member is None:
      raise ValueError('Cannot find member component')
    self.__member = member

  def _on_next_tick(self) -> None:
    curr_time = self.engine.clock.current_time
    if (
      self.__member.membership_start_time <= curr_time
      and curr_time.weekday() == 2
      and curr_time.hour == 13
      and curr_time.minute == 0
    ):
      span = 2
      end_time = curr_time + timedelta(hours=span)
      if self.__staying_period is None:
        self.__staying_period = (curr_time, end_time)
        self.__inno_wing.enter(self.__member)
        self.__vr_gadget.acquire(self.__member)
      else:
        self.__staying_period = (
          self.__staying_period[0],
          self.__staying_period[1] if self.__staying_period[1] > end_time else end_time
        )

    if (
      self.__staying_period is not None
      and (
        self.__member.membership_end_time <= curr_time
        or curr_time >= self.__staying_period[1]
      )
    ):
      self.__staying_period = None
      self.__inno_wing.exit(self.__member)
      self.__vr_gadget.release(self.__member)
