from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional
import random

from ..engine.component import Component
from ..engine.object import Object

from ..users.member import Member

from ..spaces.space import Space
from ..spaces.inno_wing import InnoWing
from ..spaces.ar_vr_room import ArVrRoom
from ..spaces.machine_room import MachineRoom
from ..spaces.workshop_1 import Workshop1
from ..spaces.event_hall_a import EventHallA

from ..machines import Machine
from ..machines.three_d_printer import ThreeDPrinter
from ..machines.movable_ar_vr_development_station import MovableArVrDevelopmentStation
from ..machines.drilling_machine import DrillingMachine

from ..reusable_inventories import ReusableInventory
from ..reusable_inventories.drill import Drill
from ..reusable_inventories.grinder import Grinder
from ..reusable_inventories.saw import Saw

from ..utils.time import time_equals
from ..utils.random.int import randint_nd

from .simple_schedule import SimpleSchedule


class InnoLensMember(Component):
  __member: Member

  __inno_wing: InnoWing
  __ar_vr_room: ArVrRoom
  __machine_room: MachineRoom
  __workshop_1: Workshop1
  __event_hall_a: EventHallA
  __spaces: List[Space]

  __drilling_machine: DrillingMachine
  __movable_ar_vr_development_station: MovableArVrDevelopmentStation
  __three_d_printer: ThreeDPrinter
  __machines: List[Machine]

  __drill: Drill
  __grinder: Grinder
  __saw: Saw
  __reusable_inventories: List[ReusableInventory]

  __acquire_successful: List[str]
  __entered_space: Space

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
    self.__acquire_successful = []

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

    machine_room = self.engine.world.find_component(MachineRoom, recursive=True)
    assert machine_room is not None
    self.__machine_room = machine_room

    workshop_1 = self.engine.world.find_component(Workshop1, recursive=True)
    assert workshop_1 is not None
    self.__workshop_1 = workshop_1

    event_hall_a = self.engine.world.find_component(EventHallA, recursive=True)
    assert event_hall_a is not None
    self.__event_hall_a = event_hall_a

    self.__spaces = [ar_vr_room, machine_room, workshop_1]

    three_d_printer = inno_wing.attached_object.find_component(ThreeDPrinter, recursive=True)
    assert three_d_printer is not None
    self.__three_d_printer = three_d_printer

    movable_ar_vr_development_station = ar_vr_room.attached_object.find_component(MovableArVrDevelopmentStation, recursive=True)
    assert movable_ar_vr_development_station is not None
    self.__movable_ar_vr_development_station = movable_ar_vr_development_station

    drilling_machine = machine_room.attached_object.find_component(DrillingMachine, recursive=True)
    assert drilling_machine is not None
    self.__drilling_machine = drilling_machine

    self.__machines = [three_d_printer, movable_ar_vr_development_station, drilling_machine]

    drill = machine_room.attached_object.find_component(Drill, recursive=True)
    assert drill is not None
    self.__drill = drill

    saw = machine_room.attached_object.find_component(Saw, recursive=True)
    assert saw is not None
    self.__saw = saw

    grinder = machine_room.attached_object.find_component(Grinder, recursive=True)
    assert grinder is not None
    self.__grinder = grinder

    self.__reusable_inventories = [drill, saw, grinder]

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
        or time_equals(shifted_time, weekday=3, hour=13, minute=0) # Thr 13:00
        or time_equals(shifted_time, weekday=4, hour=14, minute=0) # Fri 14:00
      )
    ):
      span = randint_nd(lower=5 * 60, upper=7 * 60 + 30, step=30, mean=6 * 60, stddev=60)
      return current_time + timedelta(minutes=span)

    if (
      self.__member.membership_start_time <= current_time
      and (
        time_equals(current_time, weekday=0, hour=18, minute=30) # Mon 18:30
      )
    ):
      span = 120
      return current_time + timedelta(minutes=span)
    return None

  def __should_schedule_end(self, current_time: datetime, scheduled_end_time: datetime) -> bool:
    return (
      self.__member.membership_end_time <= current_time
      or current_time >= scheduled_end_time
    )

  def __on_schedule_start(self) -> None:
    current_time = self.engine.clock.current_time
    self.__inno_wing.enter(self.__member)
    if (time_equals(current_time, weekday=0, hour=18, minute=30)):
      self.__event_hall_a.enter(self.__member)
    else:
      magicNumber = random.randint(0, 3)

      if magicNumber != 3:
        self.__spaces[magicNumber].enter(self.__member)
        self.__entered_space = self.__spaces[magicNumber]
      else:
        self.__entered_space = self.__inno_wing

      if magicNumber == 0:
        if not self.__movable_ar_vr_development_station.in_use:
          self.__acquire_successful.append(self.__movable_ar_vr_development_station.instance_id)
          self.__movable_ar_vr_development_station.acquire(self.__member)
      elif magicNumber == 1:
        if not self.__drilling_machine.in_use:
          self.__acquire_successful.append(self.__drilling_machine.instance_id)
          self.__drilling_machine.acquire(self.__member)

          magicNumber2 = random.randint(0, 2)
          if magicNumber2 == 0:
            if not self.__drill.in_use:
              self.__acquire_successful.append(self.__drill.instance_id)
              self.__drill.acquire(self.__member)
          elif magicNumber2 == 1:
            if not self.__saw.in_use:
              self.__acquire_successful.append(self.__saw.instance_id)
              self.__saw.acquire(self.__member)
          elif magicNumber2 == 2:
            if not self.__grinder.in_use:
              self.__acquire_successful.append(self.__grinder.instance_id)
              self.__grinder.acquire(self.__member)
      elif magicNumber == 3:
        if not self.__three_d_printer.in_use:
          self.__acquire_successful.append(self.__three_d_printer.instance_id)
          self.__three_d_printer.acquire(self.__member)

  def __on_schedule_end(self) -> None:
    current_time = self.engine.clock.current_time

    if (time_equals(current_time, weekday=0, hour=20, minute=30)):
      self.__event_hall_a.exit(self.__member)
    else:
      for reusable_inventory in self.__reusable_inventories:
        if reusable_inventory.instance_id in self.__acquire_successful:
          reusable_inventory.release(self.__member)
          self.__acquire_successful.remove(reusable_inventory.instance_id)
      for machine in self.__machines:
        if machine.instance_id in self.__acquire_successful:
          machine.release(self.__member)
          self.__acquire_successful.remove(machine.instance_id)
      if self.__entered_space.space_id != self.__inno_wing.space_id:
        self.__entered_space.exit(self.__member)

    self.__inno_wing.exit(self.__member)
    self.__random_schedule_start_offset = timedelta(minutes=randint_nd(lower=-1 * 60, upper=1 * 60 + 30, step=30, mean=0, stddev=60))
