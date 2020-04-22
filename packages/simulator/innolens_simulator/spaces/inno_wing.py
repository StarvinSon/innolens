from __future__ import annotations

from ..engine.object import Object

from .space import Space
from .ar_vr_room import ArVrRoom
from .brainstorming_area import BrainstormingArea
from .common_makerspace_area_1 import CommonMakerspaceArea1
from .common_makerspace_area_2 import CommonMakerspaceArea2
from .digital_learning_lab import DigitalLearningLab
from .electronic_workbenches import ElectronicWorkbenches
from .event_hall_a import EventHallA
from .event_hall_b import EventHallB
from .laser_cutting_room import LaserCuttingRoom
from .machine_room import MachineRoom
from .meeting_room_1 import MeetingRoom1
from .meeting_room_2 import MeetingRoom2
from .open_event_area import OpenEventArea
from .sound_proof_room import SoundProofRoom
from .workshop_1 import Workshop1
from .workshop_2 import Workshop2
from .workshop_3 import Workshop3
from .workshop_4 import Workshop4
from .workshop_5 import Workshop5
from .workshop_6 import Workshop6
from .workshop_7 import Workshop7
from .workshop_8 import Workshop8
from .workshop_9 import Workshop9


class InnoWing(Space):
  space_id = 'inno_wing'
  space_name = 'Innoation Wing Facility'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)

    for space_class in (
      ArVrRoom,
      BrainstormingArea,
      CommonMakerspaceArea1,
      CommonMakerspaceArea2,
      DigitalLearningLab,
      ElectronicWorkbenches,
      EventHallA,
      EventHallB,
      LaserCuttingRoom,
      MachineRoom,
      MeetingRoom1,
      MeetingRoom2,
      OpenEventArea,
      SoundProofRoom,
      Workshop1,
      Workshop2,
      Workshop3,
      Workshop4,
      Workshop5,
      Workshop6,
      Workshop7,
      Workshop8,
      Workshop9
    ):
      space_obj = self.engine.create_object()
      space_obj.add_component(space_class)
      self.attached_object.add_object(space_obj)
