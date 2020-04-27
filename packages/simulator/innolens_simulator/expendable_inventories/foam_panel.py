from __future__ import annotations

from .expendable_inventory import ExpendableInventory


class FoamPanel(ExpendableInventory):
  type_id = 'foam_panel'
  type_name = 'Foam panel'
