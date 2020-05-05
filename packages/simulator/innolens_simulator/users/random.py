from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Sequence, Tuple, Type
from typing_extensions import Literal
import random

from ..engine.component import Component
from ..engine.object import Object

from ..users.member import Member

from ..spaces.space import Space
from ..spaces.inno_wing import InnoWing
from ..spaces.brainstorming_area import BrainstormingArea
from ..spaces.common_makerspace_area import CommonMakerspaceArea
from ..spaces.digital_learning_lab import DigitalLearningLab
from ..spaces.open_event_area import OpenEventArea

from ..machines.machine import Machine
from ..machines.computer import Computer

from ..reusable_inventories.reusable_inventory import ReusableInventory

from ..utils.time import time_equals
from ..utils.random.int import randint_nd

from .user_mixin import UserMixin


class RandomUser(UserMixin, Component):
  __member: Member

  __inno_wing: InnoWing

  __spaces: Sequence[Tuple[Space, Sequence[Machine], Sequence[ReusableInventory]]]

  __state: Literal['idle', 'entered', 'exited']
  __random_time_offset: timedelta
  __scheduled_exit_time: Optional[datetime]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__state = 'idle'
    self.__random_time_offset = timedelta()
    self.__scheduled_exit_time = None

  def _on_late_init(self) -> None:
    super()._on_late_init()

    member = self.attached_object.find_component(Member)
    assert member is not None
    self.__member = member

    inno_wing = self.engine.world.find_component(InnoWing, recursive=True)
    assert inno_wing is not None
    self.__inno_wing = inno_wing

    space_types: Sequence[Tuple[Type[Space], Sequence[Type[Machine]], Sequence[Type[ReusableInventory]]]] = [
      (BrainstormingArea, [], []),
      (CommonMakerspaceArea, [], []),
      (DigitalLearningLab, [Computer], []),
      (OpenEventArea, [], [])
    ]
    self.__spaces = []
    for space_type, machine_types, reusable_inventory_types in space_types:
      space = inno_wing.find_component(space_type, recursive=True)
      assert space is not None

      space_machines = []
      for machine_type in machine_types:
        machines = list(space.find_components(machine_type, recursive=True))
        assert len(machines) > 0
        space_machines.extend(machines)

      space_reusable_inventories = []
      for reusable_inventory_type in reusable_inventory_types:
        reusable_inventories = list(space.find_components(reusable_inventory_type, recursive=True))
        assert len(reusable_inventories) > 0
        space_reusable_inventories.extend(reusable_inventories)

      self.__spaces.append((space, space_machines, space_reusable_inventories))

  def _on_next_tick(self) -> None:
    super()._on_next_tick()
    current_time = self.engine.clock.current_time

    if self.__state == 'idle':
      if time_equals(current_time + self.__random_time_offset, hour=12, minute=30):
        selected_space, selected_machines, selected_reusable_inventories = random.choice(self.__spaces)
        self._enter(selected_space)
        self._acquire_first_free_machine(selected_machines)
        self._acquire_first_free_reusable_inventory(selected_reusable_inventories)

        span = randint_nd(lower=30, upper=3 * 60 + 30, step=30, mean=60, stddev=60)
        self.__scheduled_exit_time = current_time + timedelta(minutes=span)

        self.__state = 'entered'

    elif self.__state == 'entered':
      assert self.__scheduled_exit_time is not None
      if current_time == self.__scheduled_exit_time:
        self._exit_all()
        self._release_all_machines()
        self._release_all_reusable_inventories()
        self.__scheduled_exit_time = None
        self.__state = 'exited'

    elif self.__state == 'exited':
      if time_equals(current_time, hour=0, minute=0):
        self.__random_time_offset = timedelta(minutes=random.randrange(
          -4 * 60,
          4 * 60,
          30
        ))
        self.__state = 'idle'
