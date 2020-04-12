from __future__ import annotations

from datetime import datetime, timedelta

import numpy as np
import pandas as pd

from .member import Member
from .inno_lens import InnoLensMember
from .comp3356_robotics import COMP3356RoboticsMember

from ..engine.object import Object
from ..utils.random.time import randtime_nd
from ..utils.time import hk_timezone


def add_users(container: Object) -> None:
  add_inno_lens_members(container)
  add_comp3356_robotics_members(container)

def add_inno_lens_members(container: Object) -> None:
  for _ in range(3):
    obj = container.engine.create_object()
    member = obj.add_component(Member)
    member.randomize_fields(
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
    obj.add_component(InnoLensMember)
    container.add_object(obj)

def add_comp3356_robotics_members(container: Object) -> None:
  for _ in range(30):
    obj = container.engine.create_object()
    memberComp = obj.add_component(Member)
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
    obj.add_component(COMP3356RoboticsMember)
    container.add_object(obj)


def get_members_df(world: Object) -> pd.DataFrame:
  rows = list(
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
    for member in world.find_components(Member, recursive=True)
  )
  df = pd.DataFrame({
    name: pd.Series((row[name] for row in rows), dtype=dtype)
    for name, dtype in {
      'member_id': pd.StringDtype(),
      'name': pd.StringDtype(),
      'department': pd.StringDtype(),
      'type_of_study': pd.StringDtype(),
      'study_programme': pd.StringDtype(),
      'year_of_study': np.uint8,
      'affiliated_student_interest_group': pd.StringDtype(),
      'membership_start_time': pd.StringDtype(),
      'membership_end_time': pd.StringDtype()
    }.items()
  })
  assert df.notna().all(axis=None)
  return df