from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Tuple

from innolens_simulator.component import Component
from innolens_simulator.components.inno_wing import InnoWingSpaceComponent
from innolens_simulator.utils.random import randint_nd
from innolens_simulator.components.member import MemberComponent
from innolens_simulator.object import Object


class InnoLensComponent(Component):
  _inno_wing_space: InnoWingSpaceComponent
  _member: MemberComponent
  _staying_period: Optional[Tuple[datetime, datetime]]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self._staying_period = None

  def _on_late_init(self) -> None:
    inno_wing_space = self.engine.root_object.find_component(InnoWingSpaceComponent, recursive=True)
    if inno_wing_space is None:
      raise ValueError(f'Cannot find object attached with {InnoWingSpaceComponent.__name__}')
    self._inno_wing_space = inno_wing_space

    member = self.attached_object.find_component(MemberComponent)
    if member is None:
      raise ValueError('Cannot find member component')
    self._member = member

  def _on_next_tick(self) -> None:
    curr_time = self.engine.clock.current_time
    if curr_time.weekday() == 3 and curr_time.hour == 13:
      span = 2
      end_time = curr_time + timedelta(hours=span)
      if self._staying_period is None:
        self._staying_period = (curr_time, end_time)
        self._inno_wing_space.enter(self._member)
      else:
        self._staying_period = (
          self._staying_period[0],
          self._staying_period[1] if self._staying_period[1] > end_time else end_time
        )

    if self._staying_period is not None and curr_time >= self._staying_period[1]:
      self._staying_period = None
      self._inno_wing_space.exit(self._member)
