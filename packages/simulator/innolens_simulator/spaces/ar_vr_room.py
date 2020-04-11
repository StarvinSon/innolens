from __future__ import annotations

from ..engine.object import Object
from ..reusable_inventories.vr_gadget import VrGadget

from .space import Space


class ArVrRoom(Space):
  space_id = 'ar_vr_room'
  space_name = 'AR VR Room'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__add_vr_gadgets()

  def __add_vr_gadgets(self) -> None:
    for i in range(2):
      gadget_obj = self.engine.create_object()
      gadget = gadget_obj.add_component(VrGadget)
      gadget.instance_id = str(i)
      self.attached_object.add_object(gadget_obj)
