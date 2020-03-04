from __future__ import annotations

from datetime import datetime, timedelta
from typing_extensions import Final


class Clock:
  start_time: Final[datetime]
  end_time: Final[datetime]
  time_step: Final[timedelta]

  __current_time: datetime

  def __init__(self, start: datetime, end: datetime, step: timedelta):
    super().__init__()
    self.start_time = start
    self.end_time = end
    self.time_step = step
    self.__current_time = start

  @property
  def current_time(self) -> datetime:
    return self.__current_time

  def next_tick(self) -> bool:
    new_time = self.__current_time + self.time_step
    if new_time < self.end_time:
      self.__current_time = new_time
      return True
    return False
