from __future__ import annotations

from argparse import ArgumentParser
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable

import pandas as pd

from innolens_simulator import create_engine
from innolens_simulator.components.member import MemberComponent
from innolens_simulator.engine import Engine
from innolens_simulator.components.inno_lens import InnoLensComponent
from innolens_simulator.components.comp3356_robotics import COMP3356RoboticsComponent
from innolens_simulator.components.space import SpaceComponent
from innolens_simulator.components.machine import MachineComponent
from innolens_simulator.components.inventory import InventoryComponent


def add_inno_wing_space(engine: Engine) -> None:
  obj = engine.create_object()
  space = obj.add_component(SpaceComponent)
  space.name = 'Inno Wing'
  engine.world.add_object(obj)

def add_space(engine: Engine, space_name: str) -> None:
  obj = engine.create_object()
  space = obj.add_component(SpaceComponent)
  space.name = space_name
  inno_wing = SpaceComponent.find(engine.world, 'Inno Wing')
  assert inno_wing is not None
  inno_wing.attached_object.add_object(obj)

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
      year_of_study_choices=[4],
      affiliated_student_interest_groups_choices=['Project InnoLens and InnoIris (Supervisor: Dr. C.K. Chui [CS])']
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
      year_of_study_choices=[3, 4],
      affiliated_student_interest_groups_choices=['COMP3356 Robotics']
    )
    obj.add_component(COMP3356RoboticsComponent)
    engine.world.add_object(obj)


def get_member_df(engine: Engine) -> pd.DataFrame:
  return pd.DataFrame.from_dict(
    {
      'UID': member.uid,
      'Name': member.name,
      'Department': member.department,
      'Type of Study': member.type_of_study,
      'Year of Study': member.year_of_study,
      'Affiliated Student Interest Group': member.affiliated_student_interest_group
    }
    for member in engine.world.find_components(MemberComponent, recursive=True)
  )

def get_space_access_record_df(engine: Engine, space_name: str) -> pd.DataFrame:
  space = SpaceComponent.find(engine.world, space_name)
  assert space is not None
  return pd.DataFrame.from_dict(
    {
      'Time': time.isoformat(),
      'UID': uid,
      'Action': action
    }
    for time, uid, action in space.log
  )

def get_machine_access_record_df(engine: Engine, space_name: str, machine_name: str) -> pd.DataFrame:
  space = SpaceComponent.find(engine.world, space_name)
  assert space is not None
  machine = MachineComponent.find(space.attached_object, machine_name)
  assert machine is not None
  return pd.DataFrame.from_dict(
    {
      'Time': time.isoformat(),
      'UID': uid,
      'Action': action
    }
    for time, uid, action in machine.log
  )

def get_inventory_access_record_df(engine: Engine, space_name: str, inventory_name: str) -> pd.DataFrame:
  space = SpaceComponent.find(engine.world, space_name)
  assert space is not None
  inventory = InventoryComponent.find(space.attached_object, inventory_name)
  assert inventory is not None
  return pd.DataFrame.from_dict(
    {
      'Time': time.isoformat(),
      'UID': uid,
      'Action': action
    }
    for time, uid, action in inventory.log
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
  start_time=datetime(year=2019, month=9, day=1, tzinfo=timezone(timedelta(hours=8))),
  end_time=datetime(year=2019, month=12, day=1, tzinfo=timezone(timedelta(hours=8))),
  time_step=timedelta(minutes=10)
)

add_inno_wing_space(engine)
add_inventory(engine, 'Inno Wing', 'VR gadget')
add_inventory(engine, 'Inno Wing', 'Copper wire')

add_space(engine, 'Machine room')
add_machine(engine, 'Machine room', 'Waterjet cutting machine')
add_machine(engine, 'Machine room', 'CNC milling machine')

add_space(engine, 'Laser cutting room')
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
