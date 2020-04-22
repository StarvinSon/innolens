from __future__ import annotations

from ..engine.object import Object

from .space import Space

class Workshop4(Space):
  space_id = 'workshop_4'
  space_name = 'Workshop 4'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
