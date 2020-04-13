from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Tuple

from ..engine.component import Component
from ..engine.object import Object
from ..users.member import Member
from ..spaces.inno_wing import InnoWing
from ..spaces.machine_room import MachineRoom
from ..spaces.laser_cutting_room import LaserCuttingRoom
from ..machines.waterjet_cutting_machine import WaterjetCuttingMachine
from ..machines.cnc_milling_machine import CNCMillingMachine
from ..machines.acrylic_laser_cut_machine import AcrylicLaserCutMachine
from ..machines.metal_laser_cut_machine import MetalLaserCutMachine
from ..expendable_inventories.wood_plank import WoodPlank
from ..utils.random.int import randint_nd


class COMP3356RoboticsMember(Component):
  __member: Member

  __inno_wing: InnoWing

  __machine_room: MachineRoom
  __waterjet_cutting_machine: WaterjetCuttingMachine
  __cnc_milling_machine: CNCMillingMachine

  __laser_cutting_room: LaserCuttingRoom
  __acrylic_laser_cut_machine: AcrylicLaserCutMachine
  __metal_laser_cut_machine: MetalLaserCutMachine

  __wood_plank: WoodPlank

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

    machine_room = inno_wing.attached_object.find_component(MachineRoom, recursive=True)
    assert machine_room is not None
    self.__machine_room = machine_room

    waterjet_cutting_machine = machine_room.attached_object.find_component(WaterjetCuttingMachine, recursive=True)
    assert waterjet_cutting_machine is not None
    self.__waterjet_cutting_machine = waterjet_cutting_machine

    cnc_milling_machine = machine_room.attached_object.find_component(CNCMillingMachine, recursive=True)
    assert cnc_milling_machine is not None
    self.__cnc_milling_machine = cnc_milling_machine

    laser_cutting_room = inno_wing.attached_object.find_component(LaserCuttingRoom, recursive=True)
    assert laser_cutting_room is not None
    self.__laser_cutting_room = laser_cutting_room

    acrylic_laser_cut_machine = laser_cutting_room.attached_object.find_component(AcrylicLaserCutMachine, recursive=True)
    assert acrylic_laser_cut_machine is not None
    self.__acrylic_laser_cut_machine = acrylic_laser_cut_machine

    metal_laser_cut_machine = laser_cutting_room.attached_object.find_component(MetalLaserCutMachine, recursive=True)
    assert metal_laser_cut_machine is not None
    self.__metal_laser_cut_machine = metal_laser_cut_machine

    wood_plank = machine_room.attached_object.find_component(WoodPlank, recursive=True)
    assert wood_plank is not None
    self.__wood_plank = wood_plank

  def _on_next_tick(self) -> None:
    curr_time = self.engine.clock.current_time
    if (
      self.__member.membership_start_time <= curr_time
      and (
        (
          curr_time.weekday() == 0
          and curr_time.hour == 14
          and curr_time.minute == 30
        ) or (
          curr_time.weekday() == 3
          and curr_time.hour == 13
          and curr_time.minute == 30
        )
      )
    ):
      if curr_time.weekday() == 0:
        span = randint_nd(lower=45, upper=75, mean=60, stddev=5)
      else:
        span = randint_nd(lower=105, upper=135, mean=120, stddev=5)
      end_time = curr_time + timedelta(minutes=span)

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
    for space in (
      self.__inno_wing,
      self.__machine_room,
      self.__laser_cutting_room
    ):
      space.enter(self.__member)
    for machine in (
      self.__waterjet_cutting_machine,
      self.__cnc_milling_machine,
      self.__acrylic_laser_cut_machine,
      self.__metal_laser_cut_machine
    ):
      machine.acquire(self.__member)
    for expendable_inventory in (
      self.__wood_plank,
    ):
      quantity = min(expendable_inventory.quantity, randint_nd(lower=1, upper=3, mean=2, stddev=0.5))
      if quantity > 0:
        expendable_inventory.acquire(self.__member, quantity)

  def __on_activity_end(self) -> None:
    for machine in (
      self.__waterjet_cutting_machine,
      self.__cnc_milling_machine,
      self.__acrylic_laser_cut_machine,
      self.__metal_laser_cut_machine
    ):
      machine.release(self.__member)
    for space in (
      self.__machine_room,
      self.__laser_cutting_room,
      self.__inno_wing
    ):
      space.exit(self.__member)
