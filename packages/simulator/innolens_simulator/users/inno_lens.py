from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from ..engine.component import Component
from ..engine.object import Object
from ..users.member import Member
from ..spaces.inno_wing import InnoWing
from ..spaces.ar_vr_room import ArVrRoom
from ..reusable_inventories.vr_gadget import VrGadget
from ..utils.time import time_equals
from ..utils.random.int import randint_nd

from .simple_schedule import SimpleSchedule


class InnoLensMember(Component):
  __member: Member

  __inno_wing: InnoWing
  __ar_vr_room: ArVrRoom
  __vr_gadget: VrGadget

  __random_schedule_start_offset: timedelta
  __schedule: SimpleSchedule

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__random_schedule_start_offset = timedelta()
    self.__schedule = SimpleSchedule(
      self.engine.clock,
      self.__should_schedule_start,
      self.__should_schedule_end,
      self.__on_schedule_start,
      self.__on_schedule_end
    )

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
    self.__schedule.next_tick()

  def __should_schedule_start(self, current_time: datetime) -> Optional[datetime]:
    shifted_time = current_time + self.__random_schedule_start_offset
    if (
      self.__member.membership_start_time <= current_time
      and (
        time_equals(shifted_time, weekday=0, hour=10, minute=0) # Mon 10:00
        or time_equals(shifted_time, weekday=1, hour=11, minute=0) # Tue 11:00
        or time_equals(shifted_time, weekday=2, hour=12, minute=0) # Wed 12:00
        or time_equals(shifted_time, weekday=3, hour=13, minute=0) # Wed 13:00
        or time_equals(shifted_time, weekday=4, hour=14, minute=0) # Fri 14:00
      )
    ):
      span = randint_nd(lower=5 * 60, upper=7 * 60, step=30, mean=6 * 60, stddev=60)
      return current_time + timedelta(minutes=span)
    return None

  def __should_schedule_end(self, current_time: datetime, scheduled_end_time: datetime) -> bool:
    return (
      self.__member.membership_end_time <= current_time
      or current_time >= scheduled_end_time
    )

  def __on_schedule_start(self) -> None:
    self.__inno_wing.enter(self.__member)
    self.__ar_vr_room.enter(self.__member)
    self.__vr_gadget.acquire(self.__member)

  def __on_schedule_end(self) -> None:
    self.__vr_gadget.release(self.__member)
    self.__ar_vr_room.exit(self.__member)
    self.__inno_wing.exit(self.__member)
    self.__random_schedule_start_offset = timedelta(hours=randint_nd(lower=-1 * 60, upper=1 * 60, step=30, mean=6 * 60, stddev=60))

