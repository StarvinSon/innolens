from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Sequence, Tuple
from typing_extensions import Literal

from ..engine.component import Component
from ..engine.object import Object
from ..utils.random.time import randint_nd

from ..spaces.space import Space
from ..spaces.inno_wing import InnoWing
from ..spaces.event_hall_a import EventHallA
from ..spaces.event_hall_b import EventHallB
from ..spaces.digital_learning_lab import DigitalLearningLab
from ..spaces.open_event_area import OpenEventArea

from ..machines.computer import Computer

from ..reusable_inventories.raspberry_pi import RaspberryPi

from ..utils.time import time_equals, Weekday

from .member import Member
from .user_mixin import UserMixin


class COMP1117Classmate(UserMixin, Component):
  '''
  COMP1117 Introduction to CS.
  There are two subclasses, A and B.

  Schedule:
  Class   Time
  A   B
  Mon Fri 10:00 - 10:20 (Arrive early @ Open Event Area)
  Mon Fri 10:30 - 12:20 (Lecture @ Event Hall A)
  Mon Fri 12:30 - 13:20 (Lab @ Digital Learning Lab)
  Mon Fri 13:30 - [0 - 1.5 hours] (Stay Behind @ Open Event Area)
  Thu Tue 11:00 - 11:20 (Arrive early @ Open Event Area)
  Thu Tue 11:30 - 12:20 (Lecture @ Event Hall B)
  Thu Tue 12:30 - 14:20 (Lab @ Digital Learning Lab)
  Thu Tue 14:30 - [0 - 1.5 hours] (Stay Behind @ Open Event Area)

  For subclass A:
  Weekday0 = Monday, Weekday1 = Thursday
  Subclass A has 2 hours lecture on Monday and 1 hour lecture on Thursday

  For subclass B:
  Weekday0 = Friday, Weekday1 = Tueday (reversed!)
  Subclass B has 1 hours lecture on Tueday and 2 hour lecture on Friday
  '''
  subclass: Literal['a', 'b']
  __subclass_weekdays: Tuple[int, int]

  __member: Member

  __inno_wing: InnoWing

  __event_hall_a: EventHallA
  __event_hall_b: EventHallB
  __digital_learning_lab: DigitalLearningLab
  __open_event_area: OpenEventArea

  __digital_learning_lab_computers: Sequence[Computer]

  __raspberry_pis: Sequence[RaspberryPi]

  __scheduled_leave_open_event_area_time: Optional[datetime]

  __current_state: Literal[
    'idle',
    'arrive_early',
    'wait_for_lecture',
    'lecture',
    'wait_for_lab',
    'lab',
    'wait_for_stay_behind',
    'stay_behind'
  ]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__scheduled_enter_open_event_area_time = None
    self.__scheduled_leave_open_event_area_time = None
    self.__current_state = 'idle'

  def _on_late_init(self) -> None:
    super()._on_late_init()

    assert hasattr(self, 'subclass')
    if self.subclass == 'a':
      self.__subclass_weekdays = (Weekday.MONDAY, Weekday.THURSDAY)
    else:
      self.__subclass_weekdays = (Weekday.FRIDAY, Weekday.TUEDAY)

    member = self.find_component(Member)
    assert member is not None
    self.__member = member


    inno_wing = self.engine.world.find_component(InnoWing, recursive=True)
    assert inno_wing is not None
    self.__inno_wing = inno_wing


    open_event_area = self.engine.world.find_component(OpenEventArea, recursive=True)
    assert open_event_area is not None
    self.__open_event_area = open_event_area

    event_hall_a = self.engine.world.find_component(EventHallA, recursive=True)
    assert event_hall_a is not None
    self.__event_hall_a = event_hall_a

    event_hall_b = self.engine.world.find_component(EventHallB, recursive=True)
    assert event_hall_b is not None
    self.__event_hall_b = event_hall_b

    digital_learning_lab = self.engine.world.find_component(DigitalLearningLab, recursive=True)
    assert digital_learning_lab is not None
    self.__digital_learning_lab = digital_learning_lab


    self.__digital_learning_lab_computers = list(digital_learning_lab.find_components(Computer, recursive=True))
    assert len(self.__digital_learning_lab_computers) > 0


    self.__raspberry_pis = list(self.engine.world.find_components(RaspberryPi, recursive=True))
    assert len(self.__raspberry_pis) > 0

  def _on_next_tick(self) -> None:
    super()._on_next_tick()
    current_time = self.engine.clock.current_time

    if self.__member.membership_start_time <= current_time < self.__member.membership_end_time:
      if self.__current_state == 'idle':
        if (
          time_equals(current_time, weekday=self.__subclass_weekdays[0], hour=10, minute=0)
          or time_equals(current_time, weekday=self.__subclass_weekdays[1], hour=11, minute=0)
        ):
          self._enter(self.__inno_wing)
          self._enter(self.__open_event_area)
          self.__current_state = 'arrive_early'

      elif self.__current_state == 'arrive_early':
        if time_equals(current_time, minute=20):
          self._exit(self.__open_event_area)
          self.__current_state = 'wait_for_lecture'

      elif self.__current_state == 'wait_for_lecture':
        if time_equals(current_time, minute=30):
          if current_time.weekday() == self.__subclass_weekdays[0]:
            event_hall: Space = self.__event_hall_a
          else:
            event_hall = self.__event_hall_b
          self._enter(event_hall)
          self.__current_state = 'lecture'

      elif self.__current_state == 'lecture':
        if time_equals(current_time, hour=12, minute=20):
          if current_time.weekday() == self.__subclass_weekdays[0]:
            event_hall = self.__event_hall_a
          else:
            event_hall = self.__event_hall_b
          self._exit(event_hall)
          self.__current_state = 'wait_for_lab'

      elif self.__current_state == 'wait_for_lab':
        if time_equals(current_time, minute=30):
          self._enter(self.__digital_learning_lab)
          self._acquire_first_free_machine(self.__digital_learning_lab_computers)
          self._acquire_first_free_reusable_inventory(self.__raspberry_pis)
          self.__current_state = 'lab'

      elif self.__current_state == 'lab':
        if (
          time_equals(current_time, weekday=self.__subclass_weekdays[0], hour=13, minute=20)
          or time_equals(current_time, weekday=self.__subclass_weekdays[1], hour=14, minute=20)
        ):
          self._exit(self.__digital_learning_lab)
          self._release_machines(self.__digital_learning_lab_computers)
          self._release_reusable_inventories(self.__raspberry_pis)

          stay_behind_mins = randint_nd(lower=0, upper=90, step=10, mean=0, stddev=30)
          if stay_behind_mins > 0:
            self.__scheduled_leave_open_event_area_time = current_time + timedelta(minutes=30) + timedelta(minutes=stay_behind_mins)
            self.__current_state = 'wait_for_stay_behind'
          else:
            self._exit(self.__inno_wing)
            self.__current_state = 'idle'

      elif self.__current_state == 'wait_for_stay_behind':
        assert self.__scheduled_leave_open_event_area_time is not None
        if time_equals(current_time, minute=30):
          self._enter(self.__open_event_area)
          self.__current_state = 'stay_behind'

      elif self.__current_state == 'stay_behind':
        assert self.__scheduled_leave_open_event_area_time is not None
        if current_time <= self.__scheduled_leave_open_event_area_time:
          self.__scheduled_leave_open_event_area_time = None
          self._exit(self.__open_event_area)
          self._exit(self.__inno_wing)
          self.__current_state = 'idle'

    if self.__member.membership_end_time <= current_time:
      self._exit_all()
      self.__current_state = 'idle'
