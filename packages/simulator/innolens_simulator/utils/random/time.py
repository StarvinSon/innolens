from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from .int import randint_nd


def randtime_nd(
  *,
  lower: datetime,
  upper: datetime,
  step: Optional[timedelta] = None,
  mean: datetime,
  stddev: timedelta
) -> datetime:
  if step is None:
    step = timedelta(days=1)

  if lower >= upper:
    raise ValueError('lower is smaller than upper')
  if step.total_seconds() <= 0:
    raise ValueError('step must be > 0')
  if stddev.total_seconds() <= 0:
    raise ValueError('stddev must be > 0')

  lowerSec = int(lower.timestamp())
  upperSec = int(upper.timestamp())
  stepSec = int(step.total_seconds())
  meanSec = mean.timestamp()
  stddevSec = stddev.total_seconds()

  ts = randint_nd(
    lower=lowerSec,
    upper=upperSec,
    step=stepSec,
    mean=meanSec,
    stddev=stddevSec
  )
  return datetime.fromtimestamp(ts, timezone.utc)
