from __future__ import annotations

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.cluster import hierarchy as sch


class CorrelationModel:

  def correlate(self, history1: np.ndarray, history2: np.ndarray, *, show_ui: bool = False) -> np.ndarray:
    k = 3  # 3 * 2 = 6 hours
    n = len(history1)
    cross_correlation = np.correlate(history1, history2, mode='full')
    center_cross_correlation = cross_correlation[n - k - 1 : n + k]
    offset = np.argmax(center_cross_correlation) - k
    history2rolled = np.roll(history2, offset)
    corrcoef = np.corrcoef(history1, history2rolled)[0, 1]

    if np.isnan(corrcoef):
      corrcoef = -2

    if show_ui:
      print(offset, corrcoef)

    return {
      'offset': int(offset),
      'corrcoef': float(corrcoef)
    }
