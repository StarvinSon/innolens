from __future__ import annotations

from ..engine.object import Object

from .space import Space

class EventHallB(Space):
  space_id = 'event_hall_b'
  space_name = 'Event Hall B'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
