from __future__ import annotations

from .reusable_inventory import ReusableInventory


class MultiMeter(ReusableInventory):
  type_id = 'multi_meter'
  type_name = 'Multi-Meter'
