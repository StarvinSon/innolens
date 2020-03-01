from __future__ import annotations

from functools import lru_cache
from math import ceil, floor
from typing import Optional, Tuple

import numpy as np
import scipy.stats


@lru_cache()
def _get_nd_prob(mean: float, stddev: float, discrete_step: int) -> Tuple[np.ndarray, np.ndarray]:
  '''
  Get a tuple (values, probabilities).
  values: an array of integer within [mean - 3 * stddev - discret_step, mean + 3 * stddev + discret_step]
  probabilities: an array of probabilities in normal distribution
  '''
  discrete_upper = ceil((mean + stddev * 3) / discrete_step) * discrete_step
  discrete_lower = floor((mean - stddev * 3) / discrete_step) * discrete_step
  discrete = np.arange(discrete_lower, discrete_upper + discrete_step, discrete_step)

  prob = np.concatenate([
    discrete - discrete_step / 2,
    [discrete[-1] + discrete_step / 2]
  ])
  prob = scipy.stats.norm.cdf(prob, loc=mean, scale=stddev)
  prob = prob[1:] - prob[:-1]
  prob /= prob.sum()

  return (discrete, prob)

def randint_nd(
  mean: float,
  stddev: float,
  discrete_step: Optional[int] = None
) -> int:
  '''
  Randomly get an integer within [mean - 3 * stddev - discret_step, mean + 3 * stddev + discret_step]
  according to the normal distribution.
  '''
  if discrete_step is None:
    discrete_step = 1

  discrete, prob = _get_nd_prob(mean, stddev, discrete_step)
  return np.random.choice(discrete, p=prob).item()
