from __future__ import annotations

from ..engine.object import Object

from .space import Space
from .ar_vr_room import ArVrRoom
from .brainstorming_area import BrainstormingArea
from .common_makerspace_area import CommonMakerspaceArea
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

from ..machines.three_d_printer import ThreeDPrinter
from ..machines.three_d_scanner import ThreeDScanner
from ..machines.computer import Computer


class InnoWing(Space):
  space_id = 'inno_wing'
  space_name = 'Innovation Wing Facility'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)

    for space_class in (
      ArVrRoom,
      BrainstormingArea,
      CommonMakerspaceArea,
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

    self.__add_three_d_printers()
    self.__add_three_d_scanners()
    self.__add_computers()

  def __add_three_d_printers(self) -> None:
    for i in range(3):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(ThreeDPrinter)
      machine.instance_id = f'ultimaker_3_extended_3D_printer_{i}'
      machine.instance_name = f'Ultimaker 3 Extended 3D Printer {i}'
      self.attached_object.add_object(machine_obj)

    for i in range(2):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(ThreeDPrinter)
      machine.instance_id = f'raise_3d_pro_+_3d_printer_{i}'
      machine.instance_name = f'Raise 3D PRO+ 3D Printer {i}'
      self.attached_object.add_object(machine_obj)

  def __add_three_d_scanners(self) -> None:
    for i in range(1):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(ThreeDScanner)
      machine.instance_id = str(i)
      self.attached_object.add_object(machine_obj)

  def __add_computers(self) -> None:
    for i in range(2):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(Computer)
      machine.instance_id = f'three_d_printing_area_{i}'
      machine.instance_name = f'3D Printing Area Computer {i}'
      self.attached_object.add_object(machine_obj)

    for i in range(6):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(Computer)
      machine.instance_id = f'assembling_area_1_{i}'
      machine.instance_name = f'Assembling Area 1 Computer {i}'
      self.attached_object.add_object(machine_obj)
