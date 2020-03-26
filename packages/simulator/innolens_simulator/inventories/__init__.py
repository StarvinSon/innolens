from __future__ import annotations

from typing import Any, Mapping, MutableSet, Iterator, Tuple

import pandas as pd

from ..engine.object import Object
from ..utils.time import hk_timezone

from .inventory import Inventory


def get_inventory_df(world: Object) -> pd.DataFrame:

  def iterate_rows() -> Iterator[Mapping[str, Any]]:
    ids: MutableSet[Tuple[str, str]] = set()
    for inventory in world.find_components(Inventory, recursive=True):
      if (inventory.inventory_id, inventory.instance_id) in ids:
        raise Exception(f'Duplicated space id {inventory.inventory_id} with instance id {inventory.instance_id}')
      ids.add((inventory.inventory_id, inventory.instance_id))

      yield {
        'inventory_id': inventory.inventory_id,
        'inventory_name': inventory.inventory_name,
        'instance_id': inventory.instance_id
      }

  rows = list(iterate_rows())
  df = pd.DataFrame({
    name: pd.Series((row[name] for row in rows), dtype=dtype)
    for name, dtype in {
      'inventory_id': pd.StringDtype(),
      'inventory_name': pd.StringDtype(),
      'instance_id': pd.StringDtype()
    }.items()
  })
  assert df.notna().all(axis=None)
  return df

def get_inventory_access_record_dfs(world: Object) -> Mapping[Tuple[str, str], pd.DataFrame]:

  def iterate_entries() -> Iterator[Tuple[Tuple[str, str], pd.DataFrame]]:
    ids: MutableSet[Tuple[str, str]] = set()
    for inventory in world.find_components(Inventory, recursive=True):
      if (inventory.inventory_id, inventory.instance_id) in ids:
        raise Exception(f'Duplicated space id {inventory.inventory_id} with instance id {inventory.instance_id}')
      ids.add((inventory.inventory_id, inventory.instance_id))

      rows = list({
          'time': time.astimezone(hk_timezone).isoformat(),
          'member_id': member_id,
          'action': action
        }
        for time, member_id, action in inventory.log
      )
      df = pd.DataFrame({
        name: pd.Series((row[name] for row in rows), dtype=dtype)
        for name, dtype in {
          'time': pd.StringDtype(),
          'member_id': pd.StringDtype(),
          'action': pd.CategoricalDtype(['acquire', 'release'])
        }.items()
      })
      assert df.notna().all(axis=None)
      yield ((inventory.inventory_id, inventory.instance_id), df)

  return dict(iterate_entries())
