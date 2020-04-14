from datetime import datetime
from typing import Optional
from typing_extensions import Final, Protocol

from ..engine.clock import Clock


class SimpleSchedulerShouldStart(Protocol):
  def __call__(self, current_time: datetime) -> Optional[datetime]: ...

class SimpleSchedulerShouldEnd(Protocol):
  def __call__(self, current_time: datetime, scheduled_end_time: datetime) -> bool: ...

class SimpleScheduleOnStart(Protocol):
  def __call__(self) -> None: ...

class SimpleScheduleOnEnd(Protocol):
  def __call__(self) -> None: ...


class SimpleSchedule:
  clock: Final[Clock]
  should_start: Final[SimpleSchedulerShouldStart]
  should_end: Final[SimpleSchedulerShouldEnd]

  on_start: Final[SimpleScheduleOnStart]
  on_end: Final[SimpleScheduleOnEnd]

  __scheduled_end_time: Optional[datetime]

  def __init__(
    self,
    clock: Clock,
    should_start: SimpleSchedulerShouldStart,
    should_end: SimpleSchedulerShouldEnd,
    on_start: SimpleScheduleOnStart,
    on_end: SimpleScheduleOnEnd
  ):
    super().__init__()
    self.clock = clock
    self.should_start = should_start
    self.should_end = should_end
    self.on_start = on_start
    self.on_end = on_end
    self.__scheduled_end_time = None

  def next_tick(self) -> None:
    current_time = self.clock.current_time

    end_time = self.should_start(current_time)
    if end_time is not None:
      if self.__scheduled_end_time is None:
        self.on_start()
        self.__scheduled_end_time = end_time
      elif self.__scheduled_end_time < end_time:
        self.__scheduled_end_time = end_time

    if self.__scheduled_end_time is not None:
      if self.should_end(current_time, self.__scheduled_end_time):
        self.on_end()
        self.__scheduled_end_time = None
