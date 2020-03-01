from __future__ import annotations

from typing import TypeVar


T = TypeVar('T')

def clamp(lower: T, upper: T, val: T) -> T:
  return min(upper, max(lower, val))
