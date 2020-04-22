from __future__ import annotations

from ..engine.object import Object

from .space import Space

class ElectronicWorkbenches(Space):
  space_id = 'electronic_workbenches'
  space_name = 'Electronic Workbenches'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
