from __future__ import annotations

from typing import Any

from flask import Flask, request
import numpy as np

from ..models.correlation.model import CorrelationModel
from ..models.member_cluster.model import MemberClusterModel
from ..models.history_forecast.model import HistoryForecastModel


def create_app(
  *,
  forecast_chkpt_dir_path: str
) -> Flask:
  app = Flask(__name__)

  correlation_model = CorrelationModel()
  member_cluster_model = MemberClusterModel()
  forecast_model = HistoryForecastModel(checkpoint_dir_path=forecast_chkpt_dir_path)

  @app.route('/')
  def get_index() -> str:
    return 'InnoLens Python Server'

  @app.route('/correlate', methods=('POST',))
  def post_correlation() -> Any:
    data = request.json

    X = np.array(data[0])
    Y = np.array(data[1])

    Z = correlation_model.correlate(X, Y, show_ui='ui' in request.args)

    return {
      'data': Z
    }

  @app.route('/cluster-members', methods=('POST',))
  def post_cluster() -> Any:
    data = request.json
    return member_cluster_model.cluster_json(data)

  @app.route('/forecast', methods=('POST',))
  def post_forecast() -> Any:
    data = request.json

    X = np.array(data['values'])

    Z = forecast_model.predict(X)

    return {
      'data': [
        z.tolist()
        for z in Z
      ]
    }

  return app
