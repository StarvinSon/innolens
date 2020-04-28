from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional
import random

from ..engine.component import Component
from ..engine.object import Object

from ..users.member import Member

from ..spaces.space import Space
from ..spaces.inno_wing import InnoWing
from ..spaces.brainstorming_area import BrainstormingArea
from ..spaces.common_makerspace_area_1 import CommonMakerspaceArea1
from ..spaces.common_makerspace_area_2 import CommonMakerspaceArea2
from ..spaces.digital_learning_lab import DigitalLearningLab
from ..spaces.open_event_area import OpenEventArea

from ..machines.computer import Computer

from ..utils.time import time_equals, hk_timezone
from ..utils.random.int import randint_nd

from .simple_schedule import SimpleSchedule


class GeneralUser(Component):
  __member: Member

  __inno_wing: InnoWing
  __brainstorming_area: BrainstormingArea
  __common_makerspace_area_1: CommonMakerspaceArea1
  __common_makerspace_area_2: CommonMakerspaceArea2
  __digital_learning_lab: DigitalLearningLab
  __open_event_area: OpenEventArea
  __spaces: List[Space]

  __computers: List[Computer]

  __acquire_successful: List[str]
  __entered_space: Space

  __random_schedule_start_offset: timedelta
  __schedule: SimpleSchedule

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__random_schedule_start_offset = timedelta()
    self.__schedule = SimpleSchedule(
      self.engine.clock,
      self.__should_schedule_start,
      self.__should_schedule_end,
      self.__on_schedule_start,
      self.__on_schedule_end
    )
    self.__acquire_successful = []

  def _on_late_init(self) -> None:
    member = self.attached_object.find_component(Member)
    assert member is not None
    self.__member = member

    inno_wing = self.engine.world.find_component(InnoWing, recursive=True)
    assert inno_wing is not None
    self.__inno_wing = inno_wing

    brainstorming_area = self.engine.world.find_component(BrainstormingArea, recursive=True)
    assert brainstorming_area is not None
    self.__brainstorming_area = brainstorming_area

    common_makerspace_area_1 = self.engine.world.find_component(CommonMakerspaceArea1, recursive=True)
    assert common_makerspace_area_1 is not None
    self.__common_makerspace_area_1 = common_makerspace_area_1

    common_makerspace_area_2 = self.engine.world.find_component(CommonMakerspaceArea2, recursive=True)
    assert common_makerspace_area_2 is not None
    self.__common_makerspace_area_2 = common_makerspace_area_2

    digital_learning_lab = self.engine.world.find_component(DigitalLearningLab, recursive=True)
    assert digital_learning_lab is not None
    self.__digital_learning_lab = digital_learning_lab

    open_event_area = self.engine.world.find_component(OpenEventArea, recursive=True)
    assert open_event_area is not None
    self.__open_event_area = open_event_area

    self.__spaces = [brainstorming_area, common_makerspace_area_1, common_makerspace_area_2, digital_learning_lab, open_event_area]

    computers = list(digital_learning_lab.attached_object.find_components(Computer, recursive=True))
    assert computers is not None
    self.__computers = computers

  def _on_next_tick(self) -> None:
    self.__schedule.next_tick()

  def __should_schedule_start(self, current_time: datetime) -> Optional[datetime]:
    shifted_time = current_time + self.__random_schedule_start_offset
    semester_end_time = datetime(2020, 6, 1, tzinfo=hk_timezone)
    difference = semester_end_time - current_time
    if (
      random.random() - (difference.days / 30 / 9 / 4) < 0.5
      and self.__member.membership_start_time <= current_time
      and (
        time_equals(shifted_time, weekday=0, hour=9, minute=0) # Mon 9:00
        or time_equals(shifted_time, weekday=0, hour=13, minute=0) # Mon 13:00
        or time_equals(shifted_time, weekday=0, hour=17, minute=0) # Mon 17:00

        or time_equals(shifted_time, weekday=1, hour=9, minute=0) # Tue 9:00
        or time_equals(shifted_time, weekday=1, hour=13, minute=0) # Tue 13:00
        or time_equals(shifted_time, weekday=1, hour=17, minute=0) # Tue 17:00

        or time_equals(shifted_time, weekday=2, hour=9, minute=0) # Wed 9:00
        or time_equals(shifted_time, weekday=2, hour=13, minute=0) # Wed 13:00
        or time_equals(shifted_time, weekday=2, hour=17, minute=0) # Wed 17:00

        or time_equals(shifted_time, weekday=3, hour=9, minute=0) # Thr 9:00
        or time_equals(shifted_time, weekday=3, hour=13, minute=0) # Thr 13:00
        or time_equals(shifted_time, weekday=3, hour=17, minute=0) # Thr 17:00

        or time_equals(shifted_time, weekday=4, hour=9, minute=0) # Fri 9:00
        or time_equals(shifted_time, weekday=4, hour=13, minute=0) # Fri 13:00
        or time_equals(shifted_time, weekday=4, hour=17, minute=0) # Fri 17:00

        or time_equals(shifted_time, weekday=5, hour=12, minute=0) # Sat 12:00

        or time_equals(shifted_time, weekday=6, hour=12, minute=0) # Sun 12:00
      )
    ):
      if (shifted_time.weekday() == 5 or shifted_time.weekday() == 6):
        span = randint_nd(lower=3 * 60, upper=5 * 60 + 30, step=30, mean=4 * 60, stddev=60)
      else:
        if (shifted_time.hour == 9):
          span = randint_nd(lower=2 * 60, upper=4 * 60 + 30, step=30, mean=3 * 60, stddev=60)
        elif (shifted_time.hour == 13):
          span = randint_nd(lower=3 * 60, upper=5 * 60 + 30, step=30, mean=4 * 60, stddev=60)
        elif (shifted_time.hour == 17):
          span = randint_nd(lower=4 * 60, upper=6 * 60 + 30, step=30, mean=5 * 60, stddev=60)

      return current_time + timedelta(minutes=span)
    return None

  def __should_schedule_end(self, current_time: datetime, scheduled_end_time: datetime) -> bool:
    return (
      self.__member.membership_end_time <= current_time
      or current_time >= scheduled_end_time
    )

  def __on_schedule_start(self) -> None:
    self.__inno_wing.enter(self.__member)

    magicNumber = random.randint(0, 5)

    if magicNumber < 5:
      self.__spaces[magicNumber].enter(self.__member)
      self.__entered_space = self.__spaces[magicNumber]
    else:
      self.__entered_space = self.__inno_wing

    if magicNumber == 3:
      randomComputer = random.choice(self.__computers)
      if not randomComputer.in_use:
        self.__acquire_successful.append(randomComputer.instance_id)
        randomComputer.acquire(self.__member)

  def __on_schedule_end(self) -> None:
    for computer in self.__computers:
      if computer.instance_id in self.__acquire_successful:
        computer.release(self.__member)
        self.__acquire_successful.remove(computer.instance_id)
    if self.__entered_space.space_id != self.__inno_wing.space_id:
      self.__entered_space.exit(self.__member)

    self.__inno_wing.exit(self.__member)
    self.__random_schedule_start_offset = timedelta(minutes=randint_nd(lower=-2 * 60, upper=2 * 60 + 30, step=30, mean=0, stddev=60))
