from __future__ import annotations

from ..engine.object import Object

from .space import Space

class MeetingRoom2(Space):
  space_id = 'meeting_room_2'
  space_name = 'Meeting Room 2'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
