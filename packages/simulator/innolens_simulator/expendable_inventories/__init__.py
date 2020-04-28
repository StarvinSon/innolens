from __future__ import annotations

from typing import Any, Mapping, MutableSet, Iterator, Tuple

import pandas as pd

from ..engine.object import Object
from ..utils.time import hk_timezone

from .expendable_inventory import ExpendableInventory


def get_expendable_inventory_type_df(world: Object) -> pd.DataFrame:

  def iterate_rows() -> Iterator[Mapping[str, Any]]:
    type_ids: MutableSet[str] = set()
    for inventory in world.find_components(ExpendableInventory, recursive=True):
      if inventory.type_id in type_ids:
        raise Exception(f'Duplicated expendable inventory type id {inventory.type_id}')
      type_ids.add(inventory.type_id)
      yield {
        'type_id': inventory.type_id,
        'type_name': inventory.type_name,
        'type_capacity': inventory.type_capacity
      }

  rows = list(iterate_rows())
  df = pd.DataFrame({
    name: pd.Series((row[name] for row in rows), dtype=dtype)
    for name, dtype in {
      'type_id': pd.StringDtype(),
      'type_name': pd.StringDtype(),
      'type_capacity': pd.Int16Dtype()
    }.items()
  })
  assert df.notna().all(axis=None)
  return df

def get_expendable_inventory_access_record_dfs(world: Object) -> Mapping[str, pd.DataFrame]:

  def iterate_entries() -> Iterator[Tuple[str, pd.DataFrame]]:
    type_ids: MutableSet[str] = set()
    for inventory in world.find_components(ExpendableInventory, recursive=True):
      if inventory.type_id in type_ids:
        raise Exception(f'Duplicated expendable inventory type id {inventory.type_id}')
      type_ids.add(inventory.type_id)

      rows = list(
        {
          'action': action,
          'time': time.astimezone(hk_timezone).isoformat(),
          'quantity': quantity,
          'member_id': member_id,
          'take_quantity': take_quantity
        }
        for action, time, quantity, member_id, take_quantity in inventory.access_log
      )
      df = pd.DataFrame({
        name: pd.Series((row[name] for row in rows), dtype=dtype)
        for name, dtype in {
          'action': pd.CategoricalDtype(['set', 'take']),
          'time': pd.StringDtype(),
          'quantity': pd.Int32Dtype(),
          'member_id': pd.StringDtype(),
          'take_quantity': pd.Int32Dtype()
        }.items()
      })
      assert df.notna().all(axis=None)
      yield (inventory.type_id, df)

  return dict(iterate_entries())
