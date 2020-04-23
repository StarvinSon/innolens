from __future__ import annotations

from .reusable_inventory import ReusableInventory


class InductanceCapacitanceMeter(ReusableInventory):
  type_id = 'inductance_capacitance_meter'
  type_name = 'Inductance Capacitance Meter'
