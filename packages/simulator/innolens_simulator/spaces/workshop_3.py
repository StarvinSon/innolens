from __future__ import annotations

from ..engine.object import Object

from .space import Space

class Workshop3(Space):
  space_id = 'workshop_3'
  space_name = 'Workshop 3'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
