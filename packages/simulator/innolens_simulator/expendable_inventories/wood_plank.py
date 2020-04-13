from __future__ import annotations

from .expendable_inventory import ExpendableInventory


class WoodPlank(ExpendableInventory):
  type_id = 'wood_plank'
  type_name = 'Wood Plank'
