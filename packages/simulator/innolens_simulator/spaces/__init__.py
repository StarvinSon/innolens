from __future__ import annotations

from typing import Any, MutableSet, Mapping, Iterator, Tuple

import pandas as pd

from ..engine.object import Object
from ..utils.time import hk_timezone

from .space import Space
from .inno_wing import InnoWing


def add_spaces(world: Object) -> None:
  obj = world.engine.create_object()
  obj.add_component(InnoWing)
  world.add_object(obj)


def get_space_df(world: Object) -> pd.DataFrame:

  def iterate_rows() -> Iterator[Mapping[str, Any]]:
    ids: MutableSet[str] = set()
    for space in world.find_components(Space, recursive=True):
      if space.space_id in ids:
        raise Exception(f'Duplicated space id {space.space_id}')
      ids.add(space.space_id)

      yield {
        'space_id': space.space_id,
        'space_name': space.space_name
      }

  rows = list(iterate_rows())
  df = pd.DataFrame({
    name: pd.Series((row[name] for row in rows), dtype=dtype)
    for name, dtype in {
      'space_id': pd.StringDtype(),
      'space_name': pd.StringDtype()
    }.items()
  })
  assert df.notna().all(axis=None)
  return df

def get_space_access_record_dfs(world: Object) -> Mapping[str, pd.DataFrame]:

  def iterate_entries() -> Iterator[Tuple[str, pd.DataFrame]]:
    ids: MutableSet[str] = set()
    for space in world.find_components(Space, recursive=True):
      if space.space_id in ids:
        raise Exception(f'Duplicated space with id {space.space_id}')
      ids.add(space.space_id)

      rows = list(
        {
          'time': time.astimezone(hk_timezone).isoformat(),
          'member_id': member_id,
          'action': action
        }
        for time, member_id, action in space.log
      )
      df = pd.DataFrame({
        name: pd.Series((row[name] for row in rows), dtype=dtype)
        for name, dtype in {
          'time': pd.StringDtype(),
          'member_id': pd.StringDtype(),
          'action': pd.CategoricalDtype(['enter', 'exit'])
        }.items()
      })
      assert df.notna().all(axis=None)
      yield (space.space_id, df)

  return dict(iterate_entries())
