from __future__ import annotations

from ..engine.object import Object
from ..machines.cnc_milling_machine import CNCMillingMachine
from ..machines.waterjet_cutting_machine import WaterjetCuttingMachine
from ..expendable_inventories.wood_plank import WoodPlank

from .space import Space


class MachineRoom(Space):
  space_id = 'machine_room'
  space_name = 'Machine Room'

  __wood_plank: WoodPlank

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__add_waterjet_cutting_machines()
    self.__add_cnc_milling_machines()
    self.__add_wood_plank()

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

  def __add_wood_plank(self) -> None:
    plank_obj = self.engine.create_object()
    self.__wood_plank = plank_obj.add_component(WoodPlank)
    self.attached_object.add_object(plank_obj)

  def _on_next_tick(self) -> None:
    curr_time = self.engine.clock.current_time

    # Refill wood plank to 100 every Monday
    if (
      curr_time.weekday() == 0
      and curr_time.hour == 0
      and curr_time.minute == 0
    ):
      self.__wood_plank.set_quantity(100)
