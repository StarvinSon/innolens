import { EventEmitter } from 'events';

import { autoBind, onChanged } from '../decorators';

import { Task } from './task';


export interface GetTime {
  (): number;
}

export class Scheduler extends EventEmitter {
  public readonly getTime: GetTime;

  private _tasks: Set<Task>;

  @onChanged<Scheduler, Scheduler['_state']>(function _onStateChanged(newVal, oldVal) {
    if (oldVal !== undefined && oldVal.type !== newVal.type) {
      this.emit('state-changed');
    }
  })
  declare private _state: {
    type: 'IDLE'
  } | {
    type: 'RUNNING';
    interruptLoop: () => void;
  } | {
    type: 'STOPPING'
  } | {
    type: 'STOPPED'
  };

  public constructor(getTime: GetTime = () => Date.now()) {
    super();
    this.getTime = getTime;
    this._tasks = new Set();
    this._state = {
      type: 'IDLE'
    };
  }

  public get state(): Scheduler['_state']['type'] {
    return this._state.type;
  }

  public start(): void {
    switch (this._state.type) {
      case 'RUNNING': {
        throw new Error('Scheduler is already running');
      }
      case 'STOPPING':
      case 'STOPPED': {
        throw new Error('Scheduler is stopped');
      }
      // no default
    }

    this._loop()
      .catch((err) => {
        console.error(err);
      });
  }

  private async _loop(): Promise<void> {
    this._state = {
      type: 'RUNNING',
      interruptLoop: () => {}
    };

    for (const task of this._tasks) {
      task.scheduleNext();
    }

    while (this._state.type === 'RUNNING') {
      let time: number = Reflect.apply(this.getTime, undefined, []);
      let nextTime: number | null = null;
      for (const task of this._tasks) {
        if (!task.running) {
          const { scheduledTime } = task;
          if (scheduledTime !== null) {
            nextTime = nextTime === null ? scheduledTime : Math.min(nextTime, scheduledTime);
          }
        }
      }

      // eslint-disable-next-line no-await-in-loop
      const interrupted = await new Promise<boolean>((resolve) => {
        let timerId: NodeJS.Timeout | null = null;
        const wakeUp = (interrupt: boolean): void => {
          resolve(interrupt);
          if (timerId !== null) {
            clearTimeout(timerId);
          }
        };

        (this._state as Extract<Scheduler['_state'], { type: 'RUNNING' }>)
          .interruptLoop = () => wakeUp(true);
        if (nextTime !== null) {
          timerId = setTimeout(
            () => wakeUp(false),
            Math.min(60 * 1000 /* 1min */, Math.max(0, nextTime - time))
          );
        }
      });

      time = Reflect.apply(this.getTime, undefined, []);
      if (!interrupted && nextTime !== null && (nextTime - time) <= 0) {
        for (const task of this._tasks) {
          if (!task.running) {
            const { scheduledTime } = task;
            if (scheduledTime !== null && scheduledTime - time <= 0) {
              task.run();
            }
          }
        }
      }
    }

    this._state = {
      type: 'STOPPED'
    };
    for (const task of this._tasks) {
      task.clearScheduledTime();
    }
  }

  public stop(): void {
    switch (this._state.type) {
      case 'IDLE': {
        this._state = {
          type: 'STOPPED'
        };
        break;
      }
      case 'RUNNING': {
        this._state.interruptLoop();
        this._state = {
          type: 'STOPPING'
        };
        break;
      }
      // no default
    }
  }

  public hasTask(task: Task): boolean {
    return this._tasks.has(task);
  }

  public addTask(task: Task): void {
    if (this._state.type === 'STOPPING' || this._state.type === 'STOPPED') {
      throw new Error('Scheduler is stopped');
    }
    if (this._tasks.has(task)) {
      throw new Error(`Task ${task.name} is already scheduled`);
    }
    this._tasks.add(task);
    task.on('finished', this._onTaskFinished);
    task.onScheduled(this);
    if (this._state.type === 'RUNNING') {
      this._state.interruptLoop();
      task.scheduleNext();
    }
  }

  public removeTask(task: Task): void {
    if (!this._tasks.has(task)) {
      throw new Error(`Task ${task.name} is not scheduled in this scheduler`);
    }
    this._tasks.delete(task);
    task.off('finished', this._onTaskFinished);
    task.onUnscheduled();
    if (this._state.type === 'RUNNING') {
      this._state.interruptLoop();
      task.clearScheduledTime();
    }
  }

  @autoBind()
  private _onTaskFinished(task: Task): void {
    if (this._state.type === 'RUNNING') {
      this._state.interruptLoop();
      task.scheduleNext();
    }
  }
}
