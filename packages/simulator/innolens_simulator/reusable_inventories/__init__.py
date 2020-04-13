from __future__ import annotations

from typing import Any, Mapping, MutableMapping, MutableSet, Iterator, Tuple

import pandas as pd

from ..engine.object import Object
from ..utils.time import hk_timezone

from .reusable_inventory import ReusableInventory


def get_reusable_inventory_type_df(world: Object) -> pd.DataFrame:

  def iterate_rows() -> Iterator[Mapping[str, Any]]:
    type_ids: MutableSet[str] = set()
    for inventory in world.find_components(ReusableInventory, recursive=True):
      if inventory.type_id not in type_ids:
        type_ids.add(inventory.type_id)
        yield {
          'type_id': inventory.type_id,
          'type_name': inventory.type_name
        }

  rows = list(iterate_rows())
  df = pd.DataFrame({
    name: pd.Series((row[name] for row in rows), dtype=dtype)
    for name, dtype in {
      'type_id': pd.StringDtype(),
      'type_name': pd.StringDtype()
    }.items()
  })
  assert df.notna().all(axis=None)
  return df

def get_reusable_inventory_instance_dfs(world: Object) -> Mapping[str, pd.DataFrame]:
  type_instances: MutableMapping[str, MutableMapping[str, Mapping[str, Any]]] = {}

  for inventory in world.find_components(ReusableInventory, recursive=True):
    instances = type_instances.get(inventory.type_id)
    if instances is None:
      instances = {}
      type_instances[inventory.type_id] = instances

    if inventory.instance_id in instances:
      raise Exception(f'Duplicated reusable inventory with id {inventory.type_id} and instance id {inventory.instance_id}')

    instances[inventory.instance_id] = {
      'instance_id': inventory.instance_id,
      'instance_name': inventory.instance_name
    }

  def iterate_dfs() -> Iterator[Tuple[str, pd.DataFrame]]:
    for type_id, instances in type_instances.items():
      df = pd.DataFrame({
        name: pd.Series((instance[name] for instance in instances.values()), dtype=dtype)
        for name, dtype in {
          'instance_id': pd.StringDtype(),
          'instance_name': pd.StringDtype()
        }.items()
      })
      assert df.notna().all(axis=None)
      yield (type_id, df)

  return dict(iterate_dfs())


def get_reusable_inventory_access_record_dfs(world: Object) -> Mapping[Tuple[str, str], pd.DataFrame]:

  def iterate_entries() -> Iterator[Tuple[Tuple[str, str], pd.DataFrame]]:
    ids: MutableSet[Tuple[str, str]] = set()
    for inventory in world.find_components(ReusableInventory, recursive=True):
      if (inventory.type_id, inventory.instance_id) in ids:
        raise Exception(f'Duplicated reusable inventory type id {inventory.type_id} with instance id {inventory.instance_id}')
      ids.add((inventory.type_id, inventory.instance_id))

      rows = list(
        {
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
      yield ((inventory.type_id, inventory.instance_id), df)

  return dict(iterate_entries())
