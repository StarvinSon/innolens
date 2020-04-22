from __future__ import annotations

from ..engine.object import Object

from .space import Space

class SoundProofRoom(Space):
  space_id = 'sound_proof_room'
  space_name = 'Sound Proof Room'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
