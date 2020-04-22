from __future__ import annotations

from ..engine.object import Object

from .space import Space

class DigitalLearningLab(Space):
  space_id = 'digital_learning_lab'
  space_name = 'Digital Learning Lab'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
