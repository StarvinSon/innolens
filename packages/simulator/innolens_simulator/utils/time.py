from __future__ import annotations

from datetime import datetime, timezone, timedelta
from enum import IntEnum, unique
from typing import Optional
from typing_extensions import Final


hk_timezone: Final = timezone(timedelta(hours=8))


def time_equals(
  time: datetime,
  *,
  weekday: Optional[int] = None,
  hour: Optional[int] = None,
  minute: Optional[int] = None
) -> bool:
  return (
    (weekday is None or time.weekday() == weekday)
    and (hour is None or time.hour == hour)
    and (minute is None or time.minute == minute)
  )

@unique
class Weekday(IntEnum):
  MONDAY = 0
  TUEDAY = 1
  WEDNESDAY = 2
  THURSDAY = 3
  FRIDAY = 4
  SATURADY = 5
  SUNDAY = 6
