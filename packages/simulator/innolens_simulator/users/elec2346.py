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
from ..spaces.electronic_workbenches import ElectronicWorkbenches
from ..spaces.brainstorming_area import BrainstormingArea

from ..reusable_inventories.reusable_inventory import ReusableInventory
from ..reusable_inventories.waveform_generator import WaveformGenerator
from ..reusable_inventories.function_generator import FunctionGenerator
from ..reusable_inventories.dc_power_supply import DcPowerSupply
from ..reusable_inventories.oscilloscope import Oscilloscope
from ..reusable_inventories.multi_meter import MultiMeter

from ..utils.time import time_equals, Weekday

from .member import Member
from .user_mixin import UserMixin


class ELEC2346Classmate(UserMixin, Component):
  '''
  ELEC2346 Electric circuits theory.
  There are two subclasses, A and B.

  Schedule:
  Class   Time
  A   B
  Mon Fri 15:00 - 15:20 (Gather @ Brainstorming Area)
  Mon Fri 15:20 - 16:20 (Lecture @ Event Hall B)
  Mon Fri 16:30 - 18:20 (Lab @ Electronic Workbenches)
  Mon Fri 18:30 - [0 - 1.5 hours] (Stay Behind @ Brainstorming Area)
  Thu Tue 14:00 - 14:20 (Gather @ Brainstorming Area)
  Thu Tue 14:30 - 16:20 (Lecture @ Event Hall A)
  Thu Tue 16:30 - 17:20 (Lab @ Electronic Workbenches)
  Thu Tue 17:30 - [0 - 1.5 hours] (Stay Behind @ Brainstorming Area)

  For subclass A:
  Weekday0 = Monday, Weekday1 = Thursday
  Subclass A has 1 hours lecture on Monday and 2 hour lecture on Thursday

  For subclass B:
  Weekday0 = Friday, Weekday1 = Tueday (reversed!)
  Subclass B has 2 hours lecture on Tueday and 1 hour lecture on Friday
  '''
  subclass: Literal['a', 'b']
  __subclass_weekdays: Tuple[int, int]

  __member: Member

  __inno_wing: InnoWing

  __brainstorming_area: BrainstormingArea
  __event_hall_a: EventHallA
  __event_hall_b: EventHallB
  __electronic_workbenches: ElectronicWorkbenches

  __electronic_workbenches_inventories: Sequence[ReusableInventory]

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


    brainstorming_area = self.engine.world.find_component(BrainstormingArea, recursive=True)
    assert brainstorming_area is not None
    self.__brainstorming_area = brainstorming_area

    event_hall_a = self.engine.world.find_component(EventHallA, recursive=True)
    assert event_hall_a is not None
    self.__event_hall_a = event_hall_a

    event_hall_b = self.engine.world.find_component(EventHallB, recursive=True)
    assert event_hall_b is not None
    self.__event_hall_b = event_hall_b

    electronic_workbenches = self.engine.world.find_component(ElectronicWorkbenches, recursive=True)
    assert electronic_workbenches is not None
    self.__electronic_workbenches = electronic_workbenches

    self.__electronic_workbenches_inventories = []
    for equipement in (WaveformGenerator, FunctionGenerator, DcPowerSupply, Oscilloscope, MultiMeter):
      equipements = list(electronic_workbenches.find_components(equipement, recursive=True))
      assert len(equipements) > 0
      self.__electronic_workbenches_inventories.extend(equipements)

  def _on_next_tick(self) -> None:
    super()._on_next_tick()
    current_time = self.engine.clock.current_time

    if self.__member.membership_start_time <= current_time < self.__member.membership_end_time:
      if self.__current_state == 'idle':
        if (
          time_equals(current_time, weekday=self.__subclass_weekdays[0], hour=15, minute=0)
          or time_equals(current_time, weekday=self.__subclass_weekdays[1], hour=14, minute=0)
        ):
          self._enter(self.__inno_wing)
          self._enter(self.__brainstorming_area)
          self.__current_state = 'arrive_early'

      elif self.__current_state == 'arrive_early':
        if time_equals(current_time, minute=20):
          self._exit(self.__brainstorming_area)
          self.__current_state = 'wait_for_lecture'

      elif self.__current_state == 'wait_for_lecture':
        if time_equals(current_time, minute=30):
          if current_time.weekday() == self.__subclass_weekdays[0]:
            event_hall: Space = self.__event_hall_b
          else:
            event_hall = self.__event_hall_a
          self._enter(event_hall)
          self.__current_state = 'lecture'

      elif self.__current_state == 'lecture':
        if time_equals(current_time, hour=16, minute=20):
          if current_time.weekday() == self.__subclass_weekdays[0]:
            event_hall = self.__event_hall_b
          else:
            event_hall = self.__event_hall_a
          self._exit(event_hall)
          self.__current_state = 'wait_for_lab'

      elif self.__current_state == 'wait_for_lab':
        if time_equals(current_time, minute=30):
          self._enter(self.__electronic_workbenches)
          self._acquire_first_free_reusable_inventory(self.__electronic_workbenches_inventories)
          self.__current_state = 'lab'

      elif self.__current_state == 'lab':
        if (
          time_equals(current_time, weekday=self.__subclass_weekdays[0], hour=18, minute=20)
          or time_equals(current_time, weekday=self.__subclass_weekdays[1], hour=17, minute=20)
        ):
          self._exit(self.__electronic_workbenches)
          self._release_reusable_inventories(self.__electronic_workbenches_inventories)

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
          self._enter(self.__brainstorming_area)
          self.__current_state = 'stay_behind'

      elif self.__current_state == 'stay_behind':
        assert self.__scheduled_leave_open_event_area_time is not None
        if current_time <= self.__scheduled_leave_open_event_area_time:
          self.__scheduled_leave_open_event_area_time = None
          self._exit(self.__brainstorming_area)
          self._exit(self.__inno_wing)
          self.__current_state = 'idle'

    if self.__member.membership_end_time <= current_time:
      self._exit_all()
