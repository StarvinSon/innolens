from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Tuple

from innolens_simulator.component import Component
from innolens_simulator.components.space import SpaceComponent
from innolens_simulator.components.machine import MachineComponent
from innolens_simulator.components.inventory import InventoryComponent
from innolens_simulator.components.member import MemberComponent
from innolens_simulator.object import Object


class COMP3356RoboticsComponent(Component):
  __inno_wing: SpaceComponent
  __machine_room: SpaceComponent
  __waterjet_cutting_machine: MachineComponent
  __cnc_milling_machine: MachineComponent
  __laser_cutting_room: SpaceComponent
  __acrylic_laser_cut_machine: MachineComponent
  __metal_laser_cut_machine: MachineComponent
  __copper_wire:InventoryComponent
  __member: MemberComponent
  __staying_period: Optional[Tuple[datetime, datetime]]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__staying_period = None

  def _on_late_init(self) -> None:
    inno_wing = SpaceComponent.find(self.engine.world, 'Inno Wing')
    if inno_wing is None:
      raise ValueError('Cannot find Inno Wing space')
    self.__inno_wing = inno_wing

    copper_wire = InventoryComponent.find(inno_wing.attached_object, 'Copper wire')
    if copper_wire is None:
      raise ValueError('Cannot find copper wire inventory')
    self.__copper_wire = copper_wire

    machine_room = SpaceComponent.find(inno_wing.attached_object, 'Machine room')
    if machine_room is None:
      raise ValueError('Cannot find machine room space')
    self.__machine_room = machine_room

    waterjet_cutting_machine = MachineComponent.find(machine_room.attached_object, 'Waterjet cutting machine')
    if waterjet_cutting_machine is None:
      raise ValueError('Cannot find waterjet cutting machine')
    self.__waterjet_cutting_machine = waterjet_cutting_machine

    cnc_milling_machine = MachineComponent.find(machine_room.attached_object, 'CNC milling machine')
    if cnc_milling_machine is None:
      raise ValueError('Cannot find cnc milling machine')
    self.__cnc_milling_machine = cnc_milling_machine

    laser_cutting_room = SpaceComponent.find(self.engine.world, 'Laser cutting room')
    if laser_cutting_room is None:
      raise ValueError('Cannot find laser cutting space')
    self.__laser_cutting_room = laser_cutting_room

    acrylic_laser_cut_machine = MachineComponent.find(laser_cutting_room.attached_object, 'Acrylic laser cut machine')
    if acrylic_laser_cut_machine is None:
      raise ValueError('Cannot find acrylic laser cut machine')
    self.__acrylic_laser_cut_machine = acrylic_laser_cut_machine
  
    metal_laser_cut_machine = MachineComponent.find(laser_cutting_room.attached_object, 'Metal laser cut machine')
    if metal_laser_cut_machine is None:
      raise ValueError('Cannot find metal laser cut machine')
    self.__metal_laser_cut_machine = metal_laser_cut_machine

    member = self.attached_object.find_component(MemberComponent)
    if member is None:
      raise ValueError('Cannot find member component')
    self.__member = member

  def _on_next_tick(self) -> None:
    curr_time = self.engine.clock.current_time
    if (
      curr_time.weekday() == 1 and curr_time.hour == 14 and curr_time.minute == 30
      or curr_time.weekday() == 4 and curr_time.hour == 13 and curr_time.minute == 30
    ):
      if curr_time.weekday() == 1:
        span = 60
      else:
        span = 120

      end_time = curr_time + timedelta(minutes=span)
      if self.__staying_period is None:
        self.__staying_period = (curr_time, end_time)
        self.__inno_wing.enter(self.__member)
        for space in (self.__machine_room, self.__laser_cutting_room):
          space.enter(self.__member)
        for machine in (
          self.__waterjet_cutting_machine,
          self.__cnc_milling_machine,
          self.__acrylic_laser_cut_machine,
          self.__metal_laser_cut_machine
        ):
          machine.acquire(self.__member)
        self.__copper_wire.acquire(self.__member)
      else:
        self.__staying_period = (
          self.__staying_period[0],
          self.__staying_period[1] if self.__staying_period[1] > end_time else end_time
        )

    if self.__staying_period is not None and curr_time >= self.__staying_period[1]:
      self.__staying_period = None
      self.__copper_wire.release(self.__member)
      for machine in (
        self.__waterjet_cutting_machine,
        self.__cnc_milling_machine,
        self.__acrylic_laser_cut_machine,
        self.__metal_laser_cut_machine
      ):
        machine.release(self.__member)
      for space in (self.__machine_room, self.__laser_cutting_room):
        space.exit(self.__member)
      self.__inno_wing.exit(self.__member)
