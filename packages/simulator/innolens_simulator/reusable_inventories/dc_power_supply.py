from __future__ import annotations

from .reusable_inventory import ReusableInventory


class DcPowerSupply(ReusableInventory):
  type_id = 'dc_power_supply'
  type_name = 'DC Power Supply'
