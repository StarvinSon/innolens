from __future__ import annotations

from ..engine.object import Object
from ..machines.computer import Computer
from ..reusable_inventories.raspberry_pi import RaspberryPi

from .space import Space

class DigitalLearningLab(Space):
  space_id = 'digital_learning_lab'
  space_name = 'Digital Learning Lab'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__add_computers()
    self.__add_raspberry_pis()

  def __add_computers(self) -> None:
    for i in range(28):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(Computer)
      machine.instance_id = f'digital_learning_lab_{i}'
      machine.instance_name = f'Digital Learning Lab Computer {i}'
      self.attached_object.add_object(machine_obj)

  def __add_raspberry_pis(self) -> None:
    for i in range(100):
      obj = self.engine.create_object()
      inventory = obj.add_component(RaspberryPi)
      inventory.instance_id = f'{i}'
      self.attached_object.add_object(obj)
