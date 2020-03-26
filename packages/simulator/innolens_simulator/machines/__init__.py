from __future__ import annotations

from typing import Any, MutableSet, Mapping, Tuple, Iterator, MutableSet

import pandas as pd

from ..engine.object import Object
from ..utils.time import hk_timezone

from .machine import Machine


def get_machine_df(world: Object) -> pd.DataFrame:

  def iterate_rows() -> Iterator[Mapping[str, Any]]:
    ids: MutableSet[Tuple[str, str]] = set()
    for machine in world.find_components(Machine, recursive=True):
      if (machine.machine_id, machine.instance_id) in ids:
        raise Exception(f'Duplicated machine with id {machine.machine_id} and instance id {machine.instance_id}')
      ids.add((machine.machine_id, machine.instance_id))

      yield {
        'machine_id': machine.machine_id,
        'machine_name': machine.machine_name,
        'instance_id': machine.instance_id
      }

  rows = list(iterate_rows())
  df = pd.DataFrame({
    name: pd.Series((row[name] for row in rows), dtype=dtype)
    for name, dtype in {
      'machine_id': pd.StringDtype(),
      'machine_name': pd.StringDtype(),
      'instance_id': pd.StringDtype()
    }.items()
  })
  assert df.notna().all(axis=None)
  return df

def get_machine_access_record_dfs(world: Object) -> Mapping[Tuple[str, str], pd.DataFrame]:

  def iterate_entries() -> Iterator[Tuple[Tuple[str, str], pd.DataFrame]]:
    ids: MutableSet[Tuple[str, str]] = set()

    for machine in world.find_components(Machine, recursive=True):
      if (machine.machine_id, machine.instance_id) in ids:
        raise Exception(f'Duplicated machine with id {machine.machine_id} and instance id {machine.instance_id}')
      ids.add((machine.machine_id, machine.instance_id))

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
      yield ((machine.machine_id, machine.instance_id), df)

  return dict(iterate_entries())
