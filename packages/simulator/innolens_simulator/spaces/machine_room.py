from __future__ import annotations

from ..engine.object import Object
from ..machines.cnc_milling_machine import CNCMillingMachine
from ..machines.waterjet_cutting_machine import WaterjetCuttingMachine

from .space import Space


class MachineRoom(Space):
  space_id = 'machine_room'
  space_name = 'Machine Room'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__add_waterjet_cutting_machines()
    self.__add_cnc_milling_machines()

  def __add_waterjet_cutting_machines(self) -> None:
    for i in range(1):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(WaterjetCuttingMachine)
      machine.instance_id = str(i)
      self.attached_object.add_object(machine_obj)

  def __add_cnc_milling_machines(self) -> None:
    for i in range(1):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(CNCMillingMachine)
      machine.instance_id = str(i)
      self.attached_object.add_object(machine_obj)
