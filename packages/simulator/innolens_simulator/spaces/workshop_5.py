from __future__ import annotations

from ..engine.object import Object

from .space import Space

class Workshop5(Space):
  space_id = 'workshop_5'
  space_name = 'Workshop 5'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
