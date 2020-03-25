from __future__ import annotations

from argparse import ArgumentParser
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable, Optional
from typing_extensions import Final

import pandas as pd

from . import create_engine
from .components.member import MemberComponent
from .engine import Engine
from .components.inno_lens import InnoLensComponent
from .components.comp3356_robotics import COMP3356RoboticsComponent
from .components.space import SpaceComponent
from .components.machine import MachineComponent
from .components.inventory import InventoryComponent
from .utils.random.time import randtime_nd


hk_timezone: Final = timezone(timedelta(hours=8))


def add_space(engine: Engine, parent_space_name: Optional[str], space_name: str) -> None:
  obj = engine.create_object()
  space = obj.add_component(SpaceComponent)
  space.name = space_name

  if parent_space_name is None:
    parent_space_obj = engine.world
  else:
    parent_space = SpaceComponent.find(engine.world, parent_space_name)
    assert parent_space is not None
    parent_space_obj = parent_space.attached_object

  parent_space_obj.add_object(obj)

def add_machine(engine: Engine, space_name: str, machine_name: str) -> None:
  obj = engine.create_object()
  machine = obj.add_component(MachineComponent)
  machine.name = machine_name

  space = SpaceComponent.find(engine.world, space_name)
  assert space is not None

  space.attached_object.add_object(obj)

def add_inventory(engine: Engine, space_name: str, inventory_name: str) -> None:
  obj = engine.create_object()
  inventory = obj.add_component(InventoryComponent)
  inventory.name = inventory_name

  space = SpaceComponent.find(engine.world, space_name)
  assert space is not None

  space.attached_object.add_object(obj)


def add_inno_lens_members(engine: Engine) -> None:
  for _ in range(3):
    obj = engine.create_object()
    memberComp = obj.add_component(MemberComponent)
    memberComp.randomize_fields(
      department_choices=['Computer Science'],
      type_of_study_choices=['Undergraduate'],
      study_programme_choices=['JS6963','JS6951'],
      year_of_study_choices=[4],
      affiliated_student_interest_groups_choices=['Project InnoLens and InnoIris (Supervisor: Dr. C.K. Chui [CS])'],
      membership_start_time=randtime_nd(
        lower=datetime(2019, 10, 1, tzinfo=hk_timezone),
        upper=datetime(2020, 10, 14, tzinfo=hk_timezone),
        step=timedelta(days=1),
        mean=datetime(2019, 10, 7, tzinfo=hk_timezone),
        stddev=timedelta(days=2)
      ),
      membership_end_time=datetime(2020, 6, 1, tzinfo=hk_timezone)
    )
    obj.add_component(InnoLensComponent)
    engine.world.add_object(obj)

def add_comp3356_robotics_members(engine: Engine) -> None:
  for _ in range(30):
    obj = engine.create_object()
    memberComp = obj.add_component(MemberComponent)
    memberComp.randomize_fields(
      department_choices=[
        'Mechanical Engineering',
        'Computer Science',
        'Electrical and Electronic Engineering'
      ],
      type_of_study_choices=['Undergraduate'],
      study_programme_choices=['JS6963','JS6951'],
      year_of_study_choices=[3, 4],
      affiliated_student_interest_groups_choices=['COMP3356 Robotics'],
      membership_start_time=randtime_nd(
        lower=datetime(2020, 1, 1, tzinfo=hk_timezone),
        upper=datetime(2020, 1, 14, tzinfo=hk_timezone),
        step=timedelta(days=1),
        mean=datetime(2020, 1, 7, tzinfo=hk_timezone),
        stddev=timedelta(days=3)
      ),
      membership_end_time=datetime(2020, 6, 1, tzinfo=hk_timezone)
    )
    obj.add_component(COMP3356RoboticsComponent)
    engine.world.add_object(obj)


def get_member_df(engine: Engine) -> pd.DataFrame:
  return pd.DataFrame.from_dict(
    {
      'member_id': member.member_id,
      'name': member.name,
      'department': member.department,
      'type_of_study': member.type_of_study,
      'study_programme': member.study_programme,
      'year_of_study': member.year_of_study,
      'affiliated_student_interest_group': member.affiliated_student_interest_group,
      'membership_start_time': member.membership_start_time.astimezone(hk_timezone).isoformat(),
      'membership_end_time': member.membership_end_time.astimezone(hk_timezone).isoformat()
    }
    for member in engine.world.find_components(MemberComponent, recursive=True)
  )

def get_space_access_record_df(engine: Engine, space_name: str) -> pd.DataFrame:
  space = SpaceComponent.find(engine.world, space_name)
  assert space is not None

  return pd.DataFrame.from_dict(
    {
      'time': time.astimezone(hk_timezone).isoformat(),
      'member_id': member_id,
      'action': action
    }
    for time, member_id, action in space.log
  )

def get_machine_access_record_df(engine: Engine, space_name: str, machine_name: str) -> pd.DataFrame:
  space = SpaceComponent.find(engine.world, space_name)
  assert space is not None

  machine = MachineComponent.find(space.attached_object, machine_name)
  assert machine is not None

  return pd.DataFrame.from_dict(
    {
      'time': time.astimezone(hk_timezone).isoformat(),
      'member_id': member_id,
      'action': action
    }
    for time, member_id, action in machine.log
  )

def get_inventory_access_record_df(engine: Engine, space_name: str, inventory_name: str) -> pd.DataFrame:
  space = SpaceComponent.find(engine.world, space_name)
  assert space is not None

  inventory = InventoryComponent.find(space.attached_object, inventory_name)
  assert inventory is not None

  return pd.DataFrame.from_dict(
    {
      'time': time.isoformat(),
      'member_id': member_id,
      'action': action
    }
    for time, member_id, action in inventory.log
  )

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

add_space(engine, None, 'Inno Wing')
add_inventory(engine, 'Inno Wing', 'VR gadget')
add_inventory(engine, 'Inno Wing', 'Copper wire')

add_space(engine, 'Inno Wing', 'Machine room')
add_machine(engine, 'Machine room', 'Waterjet cutting machine')
add_machine(engine, 'Machine room', 'CNC milling machine')

add_space(engine, 'Inno Wing', 'Laser cutting room')
add_machine(engine, 'Laser cutting room', 'Acrylic laser cut machine')
add_machine(engine, 'Laser cutting room', 'Metal laser cut machine')

add_inno_lens_members(engine)
add_comp3356_robotics_members(engine)

engine.run()

result = {
  'members': get_member_df(engine),

  'inno_wing_access_records': get_space_access_record_df(engine, 'Inno Wing'),
  'vr_gadget_access_records': get_inventory_access_record_df(engine, 'Inno Wing', 'VR gadget'),
  'copper_wire_access_records': get_inventory_access_record_df(engine, 'Inno Wing', 'Copper wire'),

  'machine_room_access_records': get_space_access_record_df(engine, 'Machine room'),
  'waterjet_cutting_machine_access_records': get_machine_access_record_df(engine, 'Machine room', 'Waterjet cutting machine'),
  'cnc_milling_machine_access_records': get_machine_access_record_df(engine, 'Machine room', 'CNC milling machine'),

  'laser_cutting_room_access_records': get_space_access_record_df(engine, 'Laser cutting room'),
  'acrylic_laser_cut_machine_access_records': get_machine_access_record_df(engine, 'Laser cutting room', 'Acrylic laser cut machine'),
  'metal_laser_cut_machine_access_records': get_machine_access_record_df(engine, 'Laser cutting room', 'Metal laser cut machine')
}

output_path.mkdir(parents=True, exist_ok=True)
for key, df in result.items():
  df.to_csv(output_path / f'{key}.csv', index=False)
