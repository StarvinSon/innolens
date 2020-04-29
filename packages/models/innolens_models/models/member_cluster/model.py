from __future__ import annotations

from typing import Any

import numpy as np
import matplotlib.pyplot as plt
from scipy.cluster import hierarchy as sch


class MemberClusterModel:

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

  def cluster_json(self, histories_json: Any, *, show_ui: bool = False) -> np.ndarray:
    X = np.zeros((
      len(histories_json['memberIds']),
      len(histories_json['timeSpans']),
      len(histories_json['features'])
    ))
    for history_idx, history_id in enumerate(histories_json['memberIds']):
      for feature_idx, feature_id in enumerate(histories_json['features']):
        X[history_idx, :, feature_idx] = histories_json['values'][history_idx][feature_idx]

    Z = self.cluster(X, show_ui=show_ui)

    return {
      'data': [
        *[
          {
            'clusterId': i,
            'memberId': histories_json['memberIds'][i],
            'childClusterIds': [],
            'distance': 0.0,
            'size': 1
          }
          for i in range(X.shape[0])
        ],
        *[
          {
            'clusterId': X.shape[0] + i,
            'memberId': None,
            'childClusterIds': [int(child_cluster_id_1), int(child_cluster_id_2)],
            'distance': distance,
            'size': int(size)
          }
          for i, (child_cluster_id_1, child_cluster_id_2, distance, size) in enumerate(Z)
        ]
      ]
    }
