from __future__ import annotations

from ..engine.object import Object

from .space import Space

from ..machines.podcast_station import PodcastStation
from ..machines.computer import Computer

class SoundProofRoom(Space):
  space_id = 'sound_proof_room'
  space_name = 'Sound Proof Room'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__add_podcast_stations()
    self.__add_computers()

  def __add_podcast_stations(self) -> None:
    for i in range(1):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(PodcastStation)
      machine.instance_id = str(i)
      self.attached_object.add_object(machine_obj)

  def __add_computers(self) -> None:
    for i in range(1):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(Computer)
      machine.instance_id = f'sound_proof_room'
      machine.instance_name = f'Sound Proof Room Computer'
      self.attached_object.add_object(machine_obj)
