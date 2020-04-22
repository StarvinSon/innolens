from __future__ import annotations

from ..engine.object import Object

from .space import Space

class BrainstormingArea(Space):
  space_id = 'brainstorming_area'
  space_name = 'Brainstorming Area'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
