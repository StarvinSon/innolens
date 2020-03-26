from __future__ import annotations

from ..engine.object import Object

from .space import Space
from .ar_vr_room import ArVrRoom
from .laser_cutting_room import LaserCuttingRoom
from .machine_room import MachineRoom


class InnoWing(Space):
  space_id = 'inno_wing'
  space_name = 'Innoation Wing Facility'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)

    for space_class in (
      ArVrRoom,
      LaserCuttingRoom,
      MachineRoom
    ):
      space_obj = self.engine.create_object()
      space_obj.add_component(space_class)
      self.attached_object.add_object(space_obj)
