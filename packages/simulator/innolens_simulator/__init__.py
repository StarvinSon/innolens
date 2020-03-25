from __future__ import annotations

from datetime import datetime, timedelta

from .engine import Engine
from .clock import Clock


def create_engine(
  start_time: datetime,
  end_time: datetime,
  time_step: timedelta
) -> Engine:
  return Engine(Clock(start=start_time, end=end_time, step=time_step))
