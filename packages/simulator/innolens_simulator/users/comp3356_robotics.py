from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from ..engine.component import Component
from ..engine.object import Object

from ..users.member import Member

from ..spaces.space import Space
from ..spaces.inno_wing import InnoWing
from ..spaces.common_makerspace_area_1 import CommonMakerspaceArea1
from ..spaces.electronic_workbenches import ElectronicWorkbenches
from ..spaces.laser_cutting_room import LaserCuttingRoom
from ..spaces.machine_room import MachineRoom

from ..machines import Machine
from ..machines.soldering_station import SolderingStation
from ..machines.laser_cut_machine import LaserCutMachine
from ..machines.cnc_milling_machine import CNCMillingMachine
from ..machines.waterjet_cutting_machine import WaterjetCuttingMachine

from ..reusable_inventories import ReusableInventory
from ..reusable_inventories.dc_power_supply import DcPowerSupply
from ..reusable_inventories.hand_tool import HandTool
from ..reusable_inventories.measuring_tool import MeasuringTool
from ..reusable_inventories.saw import Saw

from ..expendable_inventories.wood_plank import WoodPlank

from ..utils.random.int import randint_nd


class COMP3356RoboticsMember(Component):
  __member: Member

  __inno_wing: InnoWing
  __common_makerspace_area_1: CommonMakerspaceArea1
  __electronic_workbenches: ElectronicWorkbenches
  __laser_cutting_room: LaserCuttingRoom
  __machine_room: MachineRoom
  __spaces: List[Space]

  __soldering_station: SolderingStation
  __laser_cut_machine: LaserCutMachine
  __cnc_milling_machine: CNCMillingMachine
  __waterjet_cutting_machine: WaterjetCuttingMachine
  __machines: List[Machine]

  __dc_power_supply: DcPowerSupply
  __hand_tool: HandTool
  __measuring_tool: MeasuringTool
  __saw: Saw
  __reusable_inventories: List[ReusableInventory]

  __acquire_successful: List[str]

  __wood_plank: WoodPlank

  __activity_period: Optional[Tuple[datetime, datetime]]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__activity_period = None
    self.__acquire_successful = []

  def _on_late_init(self) -> None:
    member = self.attached_object.find_component(Member)
    assert member is not None
    self.__member = member

    inno_wing = self.engine.world.find_component(InnoWing, recursive=True)
    assert inno_wing is not None
    self.__inno_wing = inno_wing

    common_makerspace_area_1 = inno_wing.attached_object.find_component(CommonMakerspaceArea1, recursive=True)
    assert common_makerspace_area_1 is not None
    self.__common_makerspace_area_1 = common_makerspace_area_1

    electronic_workbenches = inno_wing.attached_object.find_component(ElectronicWorkbenches, recursive=True)
    assert electronic_workbenches is not None
    self.__electronic_workbenches = electronic_workbenches

    laser_cutting_room = inno_wing.attached_object.find_component(LaserCuttingRoom, recursive=True)
    assert laser_cutting_room is not None
    self.__laser_cutting_room = laser_cutting_room

    machine_room = inno_wing.attached_object.find_component(MachineRoom, recursive=True)
    assert machine_room is not None
    self.__machine_room = machine_room

    self.__spaces = [common_makerspace_area_1, electronic_workbenches, laser_cutting_room, machine_room]

    soldering_station = electronic_workbenches.attached_object.find_component(SolderingStation, recursive=True)
    assert soldering_station is not None
    self.__soldering_station = soldering_station

    laser_cut_machine = laser_cutting_room.attached_object.find_component(LaserCutMachine, recursive=True)
    assert laser_cut_machine is not None
    self.__laser_cut_machine = laser_cut_machine

    cnc_milling_machine = machine_room.attached_object.find_component(CNCMillingMachine, recursive=True)
    assert cnc_milling_machine is not None
    self.__cnc_milling_machine = cnc_milling_machine

    waterjet_cutting_machine = machine_room.attached_object.find_component(WaterjetCuttingMachine, recursive=True)
    assert waterjet_cutting_machine is not None
    self.__waterjet_cutting_machine = waterjet_cutting_machine

    self.__machines = [soldering_station, laser_cut_machine, cnc_milling_machine, waterjet_cutting_machine]

    dc_power_supply = electronic_workbenches.attached_object.find_component(DcPowerSupply, recursive=True)
    assert dc_power_supply is not None
    self.__dc_power_supply = dc_power_supply

    hand_tool = machine_room.attached_object.find_component(HandTool, recursive=True)
    assert hand_tool is not None
    self.__hand_tool = hand_tool

    measuring_tool = machine_room.attached_object.find_component(MeasuringTool, recursive=True)
    assert measuring_tool is not None
    self.__measuring_tool = measuring_tool

    saw = machine_room.attached_object.find_component(Saw, recursive=True)
    assert saw is not None
    self.__saw = saw

    self.__reusable_inventories = [dc_power_supply, hand_tool, measuring_tool, saw]

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
      *self.__spaces,
    ):
      space.enter(self.__member)
    for machine in self.__machines:
      if not machine.in_use:
        self.__acquire_successful.append(machine.instance_id)
        machine.acquire(self.__member)
    for reusable_inventory in self.__reusable_inventories:
      if not reusable_inventory.in_use:
        self.__acquire_successful.append(reusable_inventory.instance_id)
        reusable_inventory.acquire(self.__member)
    for expendable_inventory in (
      self.__wood_plank,
    ):
      quantity = min(expendable_inventory.quantity, randint_nd(lower=1, upper=3, mean=2, stddev=0.5))
      if quantity > 0:
        expendable_inventory.acquire(self.__member, quantity)

  def __on_activity_end(self) -> None:
    for machine in self.__machines:
      if machine.instance_id in self.__acquire_successful:
        machine.release(self.__member)
        self.__acquire_successful.remove(machine.instance_id)
    for reusable_inventory in self.__reusable_inventories:
      if reusable_inventory.instance_id in self.__acquire_successful:
        reusable_inventory.release(self.__member)
        self.__acquire_successful.remove(reusable_inventory.instance_id)
    for space in (
      self.__machine_room,
      self.__laser_cutting_room,
      self.__inno_wing
    ):
      space.exit(self.__member)
