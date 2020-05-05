from __future__ import annotations

from ..engine.object import Object

from .space import Space

class CommonMakerspaceArea(Space):
  '''
  The one and only real one common makerspace area in Innovation Wing.
  '''
  space_id = 'common_makerspace_area'
  space_name = 'Common Makerspace Area'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
