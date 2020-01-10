import { EventEmitter } from 'events';

import { Schedule } from './schedule';


export interface TaskAction {
  (): void | Promise<void>;
}

export class Task extends EventEmitter {
  public readonly name: string;
  public readonly schedule: Schedule;
  public readonly action: TaskAction;

  private _scheduler: import('./scheduler').Scheduler | null = null;
  private _running = false;

  public constructor(name: string, schedule: Schedule, task: TaskAction) {
    super();
    this.name = name;
    this.schedule = schedule;
    this.action = task;
  }

  public get scheduler(): import('./scheduler').Scheduler | null {
    return this._scheduler;
  }

  public onScheduled(scheduler: import('./scheduler').Scheduler): void {
    if (this._scheduler !== null) {
      throw new Error(`Task ${JSON.stringify(this.name)} is already scheduled`);
    }
    this._scheduler = scheduler;
  }

  public onUnscheduled(): void {
    if (this._scheduler === null) {
      throw new Error(`Task ${JSON.stringify(this.name)} is already unscheduled`);
    }
    this._scheduler = null;
  }

  public get scheduledTime(): number | null {
    return this.schedule.scheduledTime;
  }

  public scheduleNext(): void {
    if (this._running) {
      throw new Error(`Task ${JSON.stringify(this.name)} is still running`);
    }
    if (this._scheduler === null) {
      throw new Error(`Task ${JSON.stringify(this.name)} is not scheduled`);
    }
    this.schedule.scheduleNext(this._scheduler.getTime());
  }

  public clearScheduledTime(): void {
    this.schedule.clear();
  }

  public get running(): boolean {
    return this._running;
  }

  public run(): void {
    if (this._running) {
      throw new Error(`Task ${JSON.stringify(this.name)} is already running`);
    }
    this._running = true;
    Promise.resolve()
      .then(() => Reflect.apply(this.action, undefined, []))
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        this._running = false;
        this.emit('finished', this);
      });
  }
}
