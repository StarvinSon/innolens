from __future__ import annotations

from math import floor
from typing_extensions import Final

from .engine.object import Object
from .engine.component import Component


def add_progress_printer(container: Object) -> None:
  obj = container.engine.create_object()
  obj.add_component(ProgressPrinter)
  container.add_object(obj)


class ProgressPrinter(Component):
  __total_time_steps: Final[float]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    clock = self.engine.clock
    self.__total_time_steps = (clock.end_time - clock.start_time) / clock.time_step

  def _on_next_tick(self) -> None:
    clock = self.engine.clock

    progress = ((clock.current_time - clock.start_time) / clock.time_step) / self.__total_time_steps
    last_progress = ((clock.current_time - clock.time_step - clock.start_time) / clock.time_step) / self.__total_time_steps
    if floor(progress * 10) != floor(last_progress * 10):
      print(f'Progress: {progress * 100:.1f}%')
