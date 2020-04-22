from __future__ import annotations

from ..engine.object import Object

from .space import Space

class Workshop6(Space):
  space_id = 'workshop_6'
  space_name = 'Workshop 6'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
