from __future__ import annotations

from ..engine.object import Object
from ..machines.acrylic_laser_cut_machine import AcrylicLaserCutMachine
from ..machines.computer import Computer
from ..machines.metal_laser_cut_machine import MetalLaserCutMachine

from .space import Space


class LaserCuttingRoom(Space):
  space_id = 'laser_cutting_room'
  space_name = 'Laser Cutting Room'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__add_acrylic_laser_cut_machines()
    self.__add_metal_laser_cut_machines()
    self.__add_computers()

  def __add_acrylic_laser_cut_machines(self) -> None:
    for i in range(2):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(AcrylicLaserCutMachine)
      machine.instance_id = str(i)
      self.attached_object.add_object(machine_obj)

  def __add_metal_laser_cut_machines(self) -> None:
    for i in range(1):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(MetalLaserCutMachine)
      machine.instance_id = str(i)
      self.attached_object.add_object(machine_obj)

  def __add_computers(self) -> None:
    for i in range(2):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(Computer)
      machine.instance_id = f'laser_cutting_room_{i}'
      machine.instance_name = f'Laser Cutting Room Computer {i}'
      self.attached_object.add_object(machine_obj)
