from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Tuple

from innolens_simulator.component import Component
from innolens_simulator.components.inno_wing import InnoWingSpaceComponent
from innolens_simulator.components.member import MemberComponent
from innolens_simulator.object import Object


class InnoLensComponent(Component):
  __inno_wing_space: InnoWingSpaceComponent
  __member: MemberComponent
  __staying_period: Optional[Tuple[datetime, datetime]]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__staying_period = None

  def _on_late_init(self) -> None:
    inno_wing_space = self.engine.world.find_component(InnoWingSpaceComponent, recursive=True)
    if inno_wing_space is None:
      raise ValueError(f'Cannot find object attached with {InnoWingSpaceComponent.__name__}')
    self.__inno_wing_space = inno_wing_space

    member = self.attached_object.find_component(MemberComponent)
    if member is None:
      raise ValueError('Cannot find member component')
    self.__member = member

  def _on_next_tick(self) -> None:
    curr_time = self.engine.clock.current_time
    if curr_time.weekday() == 3 and curr_time.hour == 13 and curr_time.minute == 0:
      span = 2
      end_time = curr_time + timedelta(hours=span)
      if self.__staying_period is None:
        self.__staying_period = (curr_time, end_time)
        self.__inno_wing_space.enter(self.__member)
      else:
        self.__staying_period = (
          self.__staying_period[0],
          self.__staying_period[1] if self.__staying_period[1] > end_time else end_time
        )

    if self.__staying_period is not None and curr_time >= self.__staying_period[1]:
      self.__staying_period = None
      self.__inno_wing_space.exit(self.__member)
