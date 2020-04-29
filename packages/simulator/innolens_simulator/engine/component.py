from __future__ import annotations

from typing import TYPE_CHECKING, Callable, TypeVar, Type, Optional, Iterable
from typing_extensions import Final

if TYPE_CHECKING:
  from . import Engine
  from .object import Object


class Component:
  __attached_object: Final[Object]
  __late_inited: bool

  def __init__(self, attached_object: Object):
    super().__init__()
    self.__attached_object = attached_object
    self.__late_inited = False

  @property
  def engine(self) -> Engine:
    return self.__attached_object.engine

  @property
  def attached_object(self) -> Object:
    return self.__attached_object

  @property
  def late_inited(self) -> bool:
    return self.__late_inited

  def late_init(self) -> None:
    self.__late_inited = True
    self._on_late_init()

  def _on_late_init(self) -> None:
    pass

  def prepare_next_tick(self) -> None:
    self._on_prepare_next_tick()

  def _on_prepare_next_tick(self) -> None:
    pass

  def next_tick(self) -> None:
    self._on_next_tick()

  def _on_next_tick(self) -> None:
    pass


  def find_component(self, t: Type[TComponent], *, recursive: bool = False) -> Optional[TComponent]:
    return self.attached_object.find_component(t, recursive=recursive)

  def find_components(self, t: Type[TComponent], *, recursive: bool = False) -> Iterable[TComponent]:
    return self.attached_object.find_components(t, recursive=recursive)


TComponent = TypeVar('TComponent', bound=Component)
ComponentFactory = Callable[['Object'], TComponent]
