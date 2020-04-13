from __future__ import annotations

from argparse import ArgumentParser
from datetime import datetime, timedelta
from pathlib import Path
from typing import Mapping

import pandas as pd

from .engine import create_engine
from .users import add_users, get_members_df
from .spaces import add_spaces, get_space_df, get_space_access_record_dfs
from .machines import get_machine_type_df, get_machine_instance_dfs, get_machine_access_record_dfs
from .expendable_inventories import get_expendable_inventory_type_df, get_expendable_inventory_quantity_set_record_dfs, get_expendable_inventory_access_record_dfs
from .reusable_inventories import get_reusable_inventory_type_df, get_reusable_inventory_instance_dfs, get_reusable_inventory_access_record_dfs
from .utils.time import hk_timezone


parser = ArgumentParser(description='Simulate Inno Wing member')
parser.add_argument(
  '--output',
  help='The directory holding the simulation result',
  default='./simulation_result'
)
args = parser.parse_args()
output_path = Path(args.output)

engine = create_engine(
  start_time=datetime(year=2019, month=9, day=1, tzinfo=hk_timezone),
  end_time=datetime(year=2020, month=6, day=1, tzinfo=hk_timezone),
  time_step=timedelta(minutes=10)
)

add_spaces(engine.world)
add_users(engine.world)

engine.run()

dfs: Mapping[str, pd.DataFrame] = {
  'members.csv': get_members_df(engine.world),

  'spaces.csv': get_space_df(engine.world),
  **{
    f'space_access_records/{space_id}.csv': df
    for space_id, df in get_space_access_record_dfs(engine.world).items()
  },

  'machine_types.csv': get_machine_type_df(engine.world),
  **{
    f'machine_instances/{type_id}.csv': df
    for type_id, df in get_machine_instance_dfs(engine.world).items()
  },
  **{
    f'machine_access_records/{type_id}/{instance_id}.csv': df
    for (type_id, instance_id), df in get_machine_access_record_dfs(engine.world).items()
  },

  'reusable_inventory_types.csv': get_reusable_inventory_type_df(engine.world),
  **{
    f'reusable_inventory_instances/{type_id}.csv': df
    for type_id, df in get_reusable_inventory_instance_dfs(engine.world).items()
  },
  **{
    f'reusable_inventory_access_records/{inventory_id}/{instance_id}.csv': df
    for (inventory_id, instance_id), df in get_reusable_inventory_access_record_dfs(engine.world).items()
  },

  'expendable_inventory_types.csv': get_expendable_inventory_type_df(engine.world),
  **{
    f'expendable_inventory_quantity_set_records/{inventory_id}.csv': df
    for inventory_id, df in get_expendable_inventory_quantity_set_record_dfs(engine.world).items()
  },
  **{
    f'expendable_inventory_access_records/{inventory_id}.csv': df
    for inventory_id, df in get_expendable_inventory_access_record_dfs(engine.world).items()
  }
}

for sub_path, df in dfs.items():
  csv_path = output_path / sub_path
  csv_path.parent.mkdir(parents=True, exist_ok=True)
  df.to_csv(csv_path, index=False)
