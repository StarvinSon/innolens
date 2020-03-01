from __future__ import annotations

from argparse import ArgumentParser
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable

import pandas as pd

from innolens_simulator import create_engine
from innolens_simulator.components.member import MemberComponent
from innolens_simulator.engine import Engine
from innolens_simulator.components.inno_wing import InnoWingSpaceComponent
from innolens_simulator.components.inno_lens import InnoLensComponent


def add_inno_wing_space(engine: Engine) -> None:
  obj = engine.create_object()
  obj.add_component(InnoWingSpaceComponent)
  engine.root_object.add_object(obj)


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
    engine.root_object.add_object(obj)


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
    for member in engine.root_object.find_components(MemberComponent, recursive=True)
  )

def get_inno_wing_access_record_df(engine: Engine) -> pd.DataFrame:
  inno_wing_space = engine.root_object.find_component(InnoWingSpaceComponent, recursive=True)
  assert inno_wing_space is not None
  return pd.DataFrame.from_dict(
    {
      'Time': time.isoformat(),
      'UID': uid,
      'Action': action
    }
    for time, uid, action in inno_wing_space.log
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
  start_time=datetime(year=2019, month=9, day=1),
  end_time=datetime(year=2019, month=12, day=1),
  time_step=timedelta(hours=1)
)

add_inno_wing_space(engine)
add_inno_lens_members(engine)

engine.run()

result = {
  'members': get_member_df(engine),
  'inno_wing_access_records': get_inno_wing_access_record_df(engine)
}

output_path.mkdir(parents=True, exist_ok=True)
for key, df in result.items():
  df.to_csv(output_path / f'{key}.csv', index=False)
