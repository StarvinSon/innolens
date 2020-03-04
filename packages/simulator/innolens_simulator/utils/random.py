from __future__ import annotations

from functools import lru_cache
from math import ceil, floor
from typing import Optional, Tuple

import numpy as np
import scipy.stats


@lru_cache()
def _get_nd_prob(lower: int, upper: int, step: int, mean: float, stddev: float) -> Tuple[np.ndarray, np.ndarray]:
  '''
  Get a tuple (values, probabilities).
  values: an array of integer within [lower, upper]
  probabilities: an array of probabilities in normal distribution
  '''
  discrete = np.arange(lower, upper + step, step)

  prob = np.concatenate([
    discrete - step / 2,
    [discrete[-1] + step / 2]
  ])
  prob = scipy.stats.norm.cdf(prob, loc=mean, scale=stddev)
  prob = prob[1:] - prob[:-1]
  prob /= prob.sum()

  return (discrete, prob)

def randint_nd(
  *,
  lower: int,
  upper: int,
  step: Optional[int] = None,
  mean: float,
  stddev: float,
) -> int:
  '''
  Randomly get an integer within [mean - 3 * stddev - discret_step, mean + 3 * stddev + discret_step]
  according to the normal distribution.
  '''
  if step is None:
    step = 1

  if lower >= upper:
    raise ValueError('lower is smaller than upper')
  if step <= 0:
    raise ValueError('step must be > 0')
  if stddev <= 0:
    raise ValueError('stddev must be > 0')

  discrete, prob = _get_nd_prob(
    lower,
    upper,
    step,
    mean,
    stddev
  )
  return np.random.choice(discrete, p=prob).item()
