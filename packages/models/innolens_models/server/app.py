from __future__ import annotations

import logging
from typing import Any

from flask import Flask, request
from werkzeug.exceptions import HTTPException, BadRequest
import numpy as np

from ..models.correlation.model import CorrelationModel
from ..models.member_cluster.model import MemberClusterModel
from ..models.history_forecast.model import HistoryForecastModel
from ..models.access_causality.model import AccessCausalityModel, MissingFeautureException, UnknownFeautureException


def create_app(
  *,
  history_forecast_chkpt_dir_path: str,
  access_causality_chkpt_dir_path: str
) -> Flask:
  app = Flask(__name__)
  logger = logging.getLogger(__name__)

  correlation_model = CorrelationModel()
  member_cluster_model = MemberClusterModel()
  history_forecast_model = HistoryForecastModel(checkpoint_dir_path=history_forecast_chkpt_dir_path)
  access_causality_model = AccessCausalityModel(checkpoint_dir_path=access_causality_chkpt_dir_path)

  @app.errorhandler(Exception)
  def handle_exception(err: Exception) -> Any:
    if isinstance(err, HTTPException):
      code = err.code
      name = err.name
      description = err.description
    else:
      code = 500
      name = 'Internal Server Error'
      description = str(err)

    if code is None:
      code = 500

    if 500 <= code < 600:
      logger.error('App encountered exception', exc_info=err)

    return (
      {
        'code': code,
        'name': name,
        'description': description
      },
      code
    )

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

    Z = history_forecast_model.predict(X)

    return {
      'data': [
        z.tolist()
        for z in Z
      ]
    }


  @app.route('/access-causality/settings')
  def handle_get_access_causality_settings() -> Any:
    '''
    response body type:
    {
      data: {
        features: Array<string>
        historyWindowSize: number
        forecastWindowSize: number
        timeStepMs: number
      }
    }
    '''
    return {
      'data': {
        'features': access_causality_model.features,
        'historyWindowSize': access_causality_model.history_window_size,
        'forecastWindowSize': access_causality_model.forecast_window_size,
        'timeStepMs': access_causality_model.time_step_ms
      }
    }

  @app.route('/access-causality', methods=('POST',))
  def handle_access_causality() -> Any:
    '''
    request body type:
    {
      features: Array<string>
      values: Array<Array<number>>
    }

    response body type:
    {
      data: {
        features: Array<string>
        values: Array<Array<number>>
      }
    }
    '''
    data_json = request.json

    try:
      result = access_causality_model.predict_json(data_json)
    except (MissingFeautureException, UnknownFeautureException) as err:
      raise BadRequest(str(err))

    return {
      'data': result
    }

  return app
