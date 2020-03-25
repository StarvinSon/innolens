from __future__ import annotations

from typing import List, Type, TypeVar, Optional, Sequence, TYPE_CHECKING, Iterable
from typing_extensions import Final

from .component import Component, ComponentFactory

if TYPE_CHECKING:
  from .engine import Engine


TComponent = TypeVar('TComponent', bound=Component)

class Object:
  __engine: Final[Engine]
  __components: Final[List[Component]]
  __parent_object: Optional[Object]
  __child_objects: Final[List[Object]]

  def __init__(self, engine: Engine):
    super().__init__()
    self.__engine = engine
    self.__components = []
    self.__parent_object = None
    self.__child_objects = []

  @property
  def engine(self) -> Engine:
    return self.__engine

  @property
  def components(self) -> Sequence[Component]:
    return self.__components

  @property
  def parent_object(self) -> Optional[Object]:
    return self.__parent_object

  @property
  def child_objects(self) -> Sequence[Object]:
    return self.__child_objects

  def find_component(self, t: Type[TComponent], *, recursive: bool = False) -> Optional[TComponent]:
    try:
      return next(iter(self.find_components(t, recursive=recursive)))
    except StopIteration:
      return None

  def find_components(self, t: Type[TComponent], *, recursive: bool = False) -> Iterable[TComponent]:
    for component in self.__components:
      if isinstance(component, t):
        yield component

    if recursive:
      for child_object in self.__child_objects:
        yield from child_object.find_components(t, recursive=True)

  def add_component(self, factory: ComponentFactory[TComponent]) -> TComponent:
    component = factory(self)
    self.__components.append(component)
    return component

  def add_object(self, child_object: Object) -> None:
    if child_object.__parent_object is self:
      return
    if child_object is self.engine.world:
      raise ValueError('Cannot move root object')

    if child_object.parent_object is not None:
      child_object.parent_object.__child_objects.remove(child_object)
    child_object.__parent_object = self
    self.__child_objects.append(child_object)

  def remove_object(self, child_object: Object) -> None:
    if child_object not in self.__child_objects:
      raise ValueError('Object does not contain this child object')

    self.__child_objects.remove(child_object)
    child_object.__parent_object = None

  def prepare_next_tick(self) -> None:
    for component in self.__components:
      if not component.late_inited:
        component.late_init()
    for component in self.__components:
      component.prepare_next_tick()
    for child_object in self.__child_objects:
      child_object.prepare_next_tick()

  def next_tick(self) -> None:
    for component in self.__components:
      component.next_tick()
    for child_object in self.__child_objects:
      child_object.next_tick()
