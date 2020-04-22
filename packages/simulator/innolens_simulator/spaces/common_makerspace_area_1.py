from __future__ import annotations

from ..engine.object import Object

from .space import Space

class CommonMakerspaceArea1(Space):
  space_id = 'common_makerspace_area_1'
  space_name = 'Common Makerspace Area 1'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
