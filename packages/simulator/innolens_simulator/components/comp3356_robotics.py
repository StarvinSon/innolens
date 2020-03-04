from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Tuple

from innolens_simulator.component import Component
from innolens_simulator.components.machine_room import MachineRoomComponent
from innolens_simulator.components.member import MemberComponent
from innolens_simulator.object import Object
from innolens_simulator.components.inno_wing import InnoWingSpaceComponent


class COMP3356RoboticsComponent(Component):
  __inno_wing: InnoWingSpaceComponent
  __machine_room: MachineRoomComponent
  __member: MemberComponent
  __staying_period: Optional[Tuple[datetime, datetime]]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__staying_period = None

  def _on_late_init(self) -> None:
    inno_wing = self.engine.world.find_component(InnoWingSpaceComponent, recursive=True)
    if inno_wing is None:
      raise ValueError(f'Cannot find object attached with {InnoWingSpaceComponent.__name__}')
    self.__inno_wing = inno_wing

    machine_room = self.engine.world.find_component(MachineRoomComponent, recursive=True)
    if machine_room is None:
      raise ValueError(f'Cannot find object attached with {MachineRoomComponent.__name__}')
    self.__machine_room = machine_room

    member = self.attached_object.find_component(MemberComponent)
    if member is None:
      raise ValueError('Cannot find member component')
    self.__member = member

  def _on_next_tick(self) -> None:
    curr_time = self.engine.clock.current_time
    if (
      curr_time.weekday() == 1 and curr_time.hour == 14 and curr_time.minute == 30
      or curr_time.weekday() == 4 and curr_time.hour == 13 and curr_time.minute == 30
    ):
      if curr_time.weekday() == 1:
        span = 60
      else:
        span = 120

      end_time = curr_time + timedelta(minutes=span)
      if self.__staying_period is None:
        self.__staying_period = (curr_time, end_time)
        self.__inno_wing.enter(self.__member)
        self.__machine_room.enter(self.__member)
      else:
        self.__staying_period = (
          self.__staying_period[0],
          self.__staying_period[1] if self.__staying_period[1] > end_time else end_time
        )

    if self.__staying_period is not None and curr_time >= self.__staying_period[1]:
      self.__staying_period = None
      self.__machine_room.exit(self.__member)
      self.__inno_wing.exit(self.__member)
