from __future__ import annotations

from typing import MutableSet, Iterable
from typing_extensions import Final

from ..engine.component import Component
from ..engine.object import Object

from .member import Member

from ..spaces.space import Space

from ..machines.machine import Machine

from ..reusable_inventories.reusable_inventory import ReusableInventory


class UserMixin(Component):
  __member: Member

  __entered_spaces: Final[MutableSet[Space]]
  __acquired_machines: Final[MutableSet[Machine]]
  __acquired_inventories: Final[MutableSet[ReusableInventory]]

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__entered_spaces = set()
    self.__acquired_machines = set()
    self.__acquired_inventories = set()

  def _on_late_init(self) -> None:
    super()._on_late_init()

    member = self.attached_object.find_component(Member)
    assert member is not None
    self.__member = member


  def _enter(self, space: Space) -> None:
    if space in self.__entered_spaces:
      raise ValueError(f'Already entered {space.space_name}')
    self.__entered_spaces.add(space)
    space.enter(self.__member)

  def _exit(self, space: Space) -> None:
    if space not in self.__entered_spaces:
      raise ValueError(f'Has not entered {space.space_name}')
    self.__entered_spaces.remove(space)
    space.exit(self.__member)

  def _exit_all(self) -> None:
    for space in self.__entered_spaces:
      space.exit(self.__member)
    self.__entered_spaces.clear()


  def _acquire_machine(self, machine: Machine) -> None:
    if machine in self.__acquired_machines:
      raise ValueError(f'Already acquired {machine.type_name} {machine.instance_name}')
    self.__acquired_machines.add(machine)
    machine.acquire(self.__member)

  def _release_machine(self, machine: Machine) -> None:
    if machine not in self.__acquired_machines:
      raise ValueError(f'Has not acquired {machine.type_name} {machine.instance_name}')
    self.__acquired_machines.remove(machine)
    machine.release(self.__member)

  def _acquire_first_free_machine(self, machines: Iterable[Machine]) -> bool:
    '''
    Acquire the first machine in the list that is not in use.
    '''
    for machine in machines:
      if machine in self.__acquired_machines:
        raise ValueError(f'Already acquired {machine.type_name} {machine.instance_name}')

    for machine in machines:
      if not machine.in_use:
        self._acquire_machine(machine)
        return True

    return False

  def _release_acquired_machines(self, machines: Iterable[Machine]) -> bool:
    '''
    Release any machine that is acquired by this user in the given list.
    '''
    released = False
    for machine in machines:
      if machine in self.__acquired_machines:
        self._release_machine(machine)
        released = True
    return released


  def _acquire_inventory(self, inventory: ReusableInventory) -> None:
    if inventory in self.__acquired_inventories:
      raise ValueError(f'Already acquired {inventory.type_name} {inventory.instance_name}')
    self.__acquired_inventories.add(inventory)
    inventory.acquire(self.__member)

  def _release_inventory(self, inventory: ReusableInventory) -> None:
    if inventory not in self.__acquired_inventories:
      raise ValueError(f'Has not acquired {inventory.type_name} {inventory.instance_name}')
    self.__acquired_inventories.remove(inventory)
    inventory.release(self.__member)

  def _acquire_first_free_inventory(self, inventories: Iterable[ReusableInventory]) -> bool:
    '''
    Acquire the first inventory in the list that is not in use.
    '''
    for inventory in inventories:
      if inventory in self.__acquired_inventories:
        raise ValueError(f'Already acquired {inventory.type_name} {inventory.instance_name}')

    for inventory in inventories:
      if not inventory.in_use:
        self._acquire_inventory(inventory)
        return True

    return False

  def _release_acquired_inventories(self, inventories: Iterable[ReusableInventory]) -> bool:
    '''
    Release any inventory that is acquired by this user in the given list.
    '''
    released = False
    for inventory in inventories:
      if inventory in self.__acquired_inventories:
        self._release_inventory(inventory)
        released = True
    return released

