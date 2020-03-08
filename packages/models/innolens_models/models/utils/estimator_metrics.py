from __future__ import annotations

from typing import Any


def to_estimator_metrics(name: str, keras_metrics_factory: Any) -> Any:
  def calc(labels: Any, predictions: Any) -> Any:
    m = keras_metrics_factory()
    m.update_state(labels, predictions['predictions'])
    return { name: m }
  return calc
