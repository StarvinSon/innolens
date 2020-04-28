from __future__ import annotations

from .reusable_inventory import ReusableInventory


class RaspberryPi(ReusableInventory):
  type_id = 'raspberry_pi'
  type_name = 'Raspberry Pi'
