from __future__ import annotations

from ..engine.object import Object

from .space import Space

class EventHallA(Space):
  space_id = 'event_hall_a'
  space_name = 'Event Hall A'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
