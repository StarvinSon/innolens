from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing_extensions import Final


hk_timezone: Final = timezone(timedelta(hours=8))


def time_equals(time: datetime, *, weekday: int, hour: int, minute: int) -> bool:
  return (
    time.weekday() == weekday
    and time.hour == hour
    and time.minute == minute
  )
