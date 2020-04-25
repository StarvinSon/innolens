from __future__ import annotations

from typing import Any

from flask import Flask, request
import numpy as np

from ..models.history_cluster.model import HistoryClusterModel
from ..models.history_forecast.model import HistoryForecastModel


def create_app(
  *,
  forecast_chkpt_dir_path: str
) -> Flask:
  app = Flask(__name__)

  clusterModel = HistoryClusterModel()
  forecastModel = HistoryForecastModel(checkpoint_dir_path=forecast_chkpt_dir_path)

  @app.route('/')
  def get_index() -> str:
    return 'InnoLens Python Server'

  @app.route('/cluster', methods=('POST',))
  def post_cluster() -> Any:
    data = request.json

    X = np.zeros((len(data['memberIds']), len(data['timeSpans']), len(data['features'])))
    for history_idx, history_id in enumerate(data['memberIds']):
      for feature_idx, feature_id in enumerate(data['features']):
        X[history_idx, :, feature_idx] = data['values'][history_id][feature_id]

    Z = clusterModel.cluster(X, show_ui='ui' in request.args)

    return {
      'data': [
        *[
          {
            'clusterId': i,
            'memberId': data['memberIds'][i],
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

  @app.route('/forecast', methods=('POST',))
  def post_forecast() -> Any:
    data = request.json

    X = np.array(data['values'])

    Z = forecastModel.predict(X)

    return {
      'data': [
        z.tolist()
        for z in Z
      ]
    }

  return app
