from __future__ import annotations

from .expendable_inventory import ExpendableInventory


class ElectricWire(ExpendableInventory):
  type_id = 'electric_wire'
  type_name = 'Electric Wire'
  type_capacity = 300
