import { Scheduler as SchedulerClass } from './utils/scheduler/scheduler';
import { createToken, ContextFunction, createSingletonDependencyRegistrant } from './context';


export type Scheduler = SchedulerClass;

export const Scheduler = createToken<Scheduler>(__filename, 'Scheduler');

export const createScheduler: ContextFunction<Scheduler> = () => new SchedulerClass();

export const registerScheduler = createSingletonDependencyRegistrant(Scheduler, createScheduler);
