from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Sequence

from ..engine.component import Component
from ..engine.object import Object
from ..utils.random.time import randint_nd

from ..spaces.inno_wing import InnoWing
from ..spaces.event_hall_a import EventHallA
from ..spaces.event_hall_b import EventHallB
from ..spaces.digital_learning_lab import DigitalLearningLab
from ..spaces.open_event_area import OpenEventArea

from ..reusable_inventories.raspberry_pi import RaspberryPi

from ..utils.time import time_equals

from .member import Member
from .user_mixin import UserMixin


class COMP1117Classmate(UserMixin, Component):
  '''
  COMP1117 Introduction to CS

  Schedule:
  Mon 10:00 - 10:20 (Arrive early @ Open Event Area)
  Mon 10:30 - 12:20 (Lecture @ Event Hall A)
  Mon 12:30 - 13:20 (Lab @ Digital Learning Lab)
  Mon 13:30 - [0 - 1.5 hours] (Stay Behind @ Open Event Area)

  Thur 11:00 - 11:20 (Arrive early @ Open Event Area)
  Thur 11:30 - 12:20 (Lecture @ Event Hall B)
  Thur 12:30 - 14:20 (Lab @ Digital Learning Lab)
  Thur 14:30 - [0 - 1.5 hours] (Stay Behind @ Open Event Area)
  '''

  __member: Member

  __inno_wing: InnoWing

  __event_hall_a: EventHallA
  __event_hall_b: EventHallB
  __digital_learning_lab: DigitalLearningLab
  __open_event_area: OpenEventArea

  __raspberry_pis: Sequence[RaspberryPi]

  __scheduled_enter_open_event_area_time: Optional[datetime]
  __scheduled_leave_open_event_area_time: Optional[datetime]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__scheduled_enter_open_event_area_time = None
    self.__scheduled_leave_open_event_area_time = None

  def _on_late_init(self) -> None:
    super()._on_late_init()

    member = self.attached_object.find_component(Member)
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

    self.__raspberry_pis = list(self.engine.world.find_components(RaspberryPi, recursive=True))
    assert len(self.__raspberry_pis) > 0

  def _on_next_tick(self) -> None:
    super()._on_next_tick()

    current_time = self.engine.clock.current_time

    if self.__member.membership_start_time <= current_time:

      # Monday
      if time_equals(current_time, weekday=0, hour=10, minute=0): # Arrive early
        self._enter(self.__inno_wing)
        self._enter(self.__open_event_area)
      elif time_equals(current_time, weekday=0, hour=10, minute=20):
        self._exit(self.__open_event_area)

      elif time_equals(current_time, weekday=0, hour=10, minute=30): # Lecture
        self._enter(self.__event_hall_a)
      elif time_equals(current_time, weekday=0, hour=12, minute=20):
        self._exit(self.__event_hall_a)

      elif time_equals(current_time, weekday=0, hour=12, minute=30): # Lab
        self._enter(self.__digital_learning_lab)
        self._acquire_first_free_inventory(self.__raspberry_pis)
      elif time_equals(current_time, weekday=0, hour=13, minute=20):
        self._exit(self.__digital_learning_lab)
        self._release_acquired_inventories(self.__raspberry_pis)
        stay_behind_mins = randint_nd(lower=0, upper=90, step=10, mean=0, stddev=30)
        if stay_behind_mins > 0:
          self.__scheduled_enter_open_event_area_time = current_time + timedelta(minutes=10)
          self.__scheduled_leave_open_event_area_time = self.__scheduled_enter_open_event_area_time + timedelta(minutes=stay_behind_mins)
        else:
          self._exit(self.__inno_wing)

      elif self.__scheduled_enter_open_event_area_time is not None and current_time == self.__scheduled_enter_open_event_area_time: # Stay behind
        self._enter(self.__open_event_area)
      elif self.__scheduled_leave_open_event_area_time is not None and current_time == self.__scheduled_leave_open_event_area_time:
        self.__scheduled_enter_open_event_area_time = None
        self.__scheduled_leave_open_event_area_time = None
        self._exit(self.__open_event_area)
        self._exit(self.__inno_wing)

      # Thursday
      elif time_equals(current_time, weekday=3, hour=11, minute=0): # Arrive early
        self._enter(self.__inno_wing)
        self._enter(self.__open_event_area)
      elif time_equals(current_time, weekday=3, hour=11, minute=20):
        self._exit(self.__open_event_area)

      elif time_equals(current_time, weekday=3, hour=11, minute=30): # Lecture
        self._enter(self.__event_hall_b)
      elif time_equals(current_time, weekday=3, hour=12, minute=20):
        self._exit(self.__event_hall_b)

      elif time_equals(current_time, weekday=3, hour=12, minute=30): # Lab
        self._enter(self.__digital_learning_lab)
        self._acquire_first_free_inventory(self.__raspberry_pis)
      elif time_equals(current_time, weekday=3, hour=14, minute=20):
        self._exit(self.__digital_learning_lab)
        self._release_acquired_inventories(self.__raspberry_pis)
        stay_behind_mins = randint_nd(lower=0, upper=90, step=10, mean=0, stddev=30)
        if stay_behind_mins > 0:
          self.__scheduled_enter_open_event_area_time = current_time + timedelta(minutes=10)
          self.__scheduled_leave_open_event_area_time = self.__scheduled_enter_open_event_area_time + timedelta(minutes=stay_behind_mins)
        else:
          self._exit(self.__inno_wing)

      elif self.__scheduled_enter_open_event_area_time is not None and current_time == self.__scheduled_enter_open_event_area_time: # Stay behind
          self._enter(self.__open_event_area)
      elif self.__scheduled_leave_open_event_area_time is not None and current_time == self.__scheduled_leave_open_event_area_time:
        self.__scheduled_enter_open_event_area_time = None
        self.__scheduled_leave_open_event_area_time = None
        self._exit(self.__open_event_area)
        self._exit(self.__inno_wing)

    if self.__member.membership_end_time <= current_time:
      self._exit_all()
