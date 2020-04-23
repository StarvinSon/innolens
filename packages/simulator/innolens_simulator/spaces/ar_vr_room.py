from __future__ import annotations

from ..engine.object import Object

from .space import Space

from ..machines.movable_ar_vr_development_station import MovableArVrDevelopmentStation
from ..machines.movable_rack_with_tv import MovableRackWithTv


class ArVrRoom(Space):
  space_id = 'ar_vr_room'
  space_name = 'AR VR Room'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__add_movable_ar_vr_development_stations()
    self.__add_movable_racks_with_tv()

  def __add_movable_ar_vr_development_stations(self) -> None:
    for i in range(2):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(MovableArVrDevelopmentStation)
      machine.instance_id = f'movable_ar_development_station_{i}'
      machine.instance_name = f'Movable AR Development Station {i}'
      self.attached_object.add_object(machine_obj)

    for i in range(2):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(MovableArVrDevelopmentStation)
      machine.instance_id = f'movable_vr_development_station_{i}'
      machine.instance_name = f'Movable VR Development Station {i}'
      self.attached_object.add_object(machine_obj)

  def __add_movable_racks_with_tv(self) -> None:
    for i in range(2):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(MovableRackWithTv)
      machine.instance_id = str(i)
      self.attached_object.add_object(machine_obj)
