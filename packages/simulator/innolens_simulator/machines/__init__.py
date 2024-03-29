from __future__ import annotations

from typing import Any, MutableSet, MutableMapping, Mapping, Tuple, Iterator

import pandas as pd

from ..engine.object import Object
from ..utils.time import hk_timezone

from .machine import Machine


def get_machine_type_df(world: Object) -> pd.DataFrame:

  def iterate_rows() -> Iterator[Mapping[str, Any]]:
    type_ids: MutableSet[str] = set()
    for machine in world.find_components(Machine, recursive=True):
      type_id = machine.type_id
      if type_id not in type_ids:
        type_ids.add(type_id)
        yield {
          'type_id': machine.type_id,
          'type_name': machine.type_name
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

def get_machine_instance_dfs(world: Object) -> Mapping[str, pd.DataFrame]:
  type_instances: MutableMapping[str, MutableMapping[str, Mapping[str, Any]]] = {}

  for machine in world.find_components(Machine, recursive=True):
    instances = type_instances.get(machine.type_id)
    if instances is None:
      instances = {}
      type_instances[machine.type_id] = instances

    if machine.instance_id in instances:
      raise Exception(f'Duplicated machine with id {machine.type_id} and instance id {machine.instance_id}')

    instances[machine.instance_id] = {
      'instance_id': machine.instance_id,
      'instance_name': machine.instance_name
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


def get_machine_access_record_dfs(world: Object) -> Mapping[Tuple[str, str], pd.DataFrame]:

  def iterate_entries() -> Iterator[Tuple[Tuple[str, str], pd.DataFrame]]:
    ids: MutableSet[Tuple[str, str]] = set()

    for machine in world.find_components(Machine, recursive=True):
      if (machine.type_id, machine.instance_id) in ids:
        raise Exception(f'Duplicated machine with id {machine.type_id} and instance id {machine.instance_id}')
      ids.add((machine.type_id, machine.instance_id))

      rows = list(
        {
          'time': time.astimezone(hk_timezone).isoformat(),
          'member_id': member_id,
          'action': action
        }
        for time, member_id, action in machine.log
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
      yield ((machine.type_id, machine.instance_id), df)

  return dict(iterate_entries())
