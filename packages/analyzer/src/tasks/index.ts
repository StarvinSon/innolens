import { depend, createToken, createSingletonRegistrant } from '../resolver';
import { Task } from '../utils/scheduler/task';

import { MemberCompositionTask } from './member-composition';


export type AllTasks = ReadonlyArray<Task>;

export const AllTasks = createToken<AllTasks>(__filename, 'AllTasks');


export const registerAllTasks = createSingletonRegistrant(
  AllTasks,
  depend(
    [
      MemberCompositionTask
    ],
    (tasks): AllTasks => tasks
  )
);
