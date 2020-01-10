import { Scheduler as SchedulerClass } from './utils/scheduler/scheduler';
import { createToken, createSingletonRegistrant } from './resolver';


export type Scheduler = SchedulerClass;


export const createScheduler = (): Scheduler => new SchedulerClass();


export const Scheduler = createToken<Scheduler>(__filename, 'Scheduler');

export const registerScheduler = createSingletonRegistrant(Scheduler, createScheduler);
