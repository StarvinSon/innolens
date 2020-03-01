from __future__ import annotations

from datetime import datetime, timedelta
from typing_extensions import Final

from innolens_simulator.object import Object
from innolens_simulator.clock import Clock


class Engine:
  __clock: Final[Clock]
  __root_object: Final[Object]

  def __init__(
    self,
    clock: Clock
  ):
    self.__clock = clock
    self.__root_object = Object(self)

  @property
  def clock(self) -> Clock:
    return self.__clock

  @property
  def root_object(self) -> Object:
    return self.__root_object

  def create_object(self) -> Object:
    return Object(self)

  def run(self) -> None:
    has_next = True
    while has_next:
      self.__root_object.prepare_next_tick()
      self.__root_object.next_tick()
      has_next = self.__clock.next_tick()
