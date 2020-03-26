from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Tuple

from ..engine.component import Component
from ..engine.object import Object
from ..users.member import Member
from ..spaces.inno_wing import InnoWing
from ..spaces.ar_vr_room import ArVrRoom
from ..inventories.vr_gadget import VrGadget


class InnoLensMember(Component):
  __member: Member

  __inno_wing: InnoWing
  __ar_vr_room: ArVrRoom
  __vr_gadget: VrGadget

  __activity_period: Optional[Tuple[datetime, datetime]]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__activity_period = None

  def _on_late_init(self) -> None:
    member = self.attached_object.find_component(Member)
    assert member is not None
    self.__member = member

    inno_wing = self.engine.world.find_component(InnoWing, recursive=True)
    assert inno_wing is not None
    self.__inno_wing = inno_wing

    ar_vr_room = inno_wing.attached_object.find_component(ArVrRoom, recursive=True)
    assert ar_vr_room is not None
    self.__ar_vr_room = ar_vr_room

    vr_gadget = ar_vr_room.attached_object.find_component(VrGadget, recursive=True)
    assert vr_gadget is not None
    self.__vr_gadget = vr_gadget

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
      if self.__activity_period is None:
        self.__activity_period = (curr_time, end_time)
        self.__on_activity_start()
      elif self.__activity_period[1] < end_time:
        self.__activity_period = (self.__activity_period[0], end_time)

    if (
      self.__activity_period is not None
      and (
        self.__member.membership_end_time <= curr_time
        or curr_time >= self.__activity_period[1]
      )
    ):
      self.__activity_period = None
      self.__on_activity_end()

  def __on_activity_start(self) -> None:
    self.__inno_wing.enter(self.__member)
    self.__ar_vr_room.enter(self.__member)
    self.__vr_gadget.acquire(self.__member)

  def __on_activity_end(self) -> None:
    self.__vr_gadget.release(self.__member)
    self.__ar_vr_room.exit(self.__member)
    self.__inno_wing.exit(self.__member)

