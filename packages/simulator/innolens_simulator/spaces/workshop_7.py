from __future__ import annotations

from ..engine.object import Object

from .space import Space

class Workshop7(Space):
  space_id = 'workshop_7'
  space_name = 'Workshop 7'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
