from __future__ import annotations

import numpy as np
import matplotlib.pyplot as plt
from scipy.cluster import hierarchy as sch


class Model:

  def cluster(self, histories: np.ndarray, *, show_ui: bool = False) -> np.ndarray:
    dists = []
    for i in range(histories.shape[0]):
      for j in range(i+1, histories.shape[0]):
        dists.append(self.history_similarity(histories[i], histories[j]))
    dists = np.array(dists)

    result = sch.linkage(
      dists,
      method='single'
    )

    if show_ui:
      fig = plt.figure()
      ax = fig.add_subplot()
      sch.dendrogram(result, ax=ax)
      plt.show()

    return result

  def history_similarity(self, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    return np.linalg.norm(x - y, axis=1).sum()
