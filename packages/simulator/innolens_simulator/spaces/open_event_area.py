from __future__ import annotations

from ..engine.object import Object

from .space import Space

class OpenEventArea(Space):
  space_id = 'open_event_area'
  space_name = 'Open Event Area'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
