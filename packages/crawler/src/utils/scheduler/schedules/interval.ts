import { Schedule } from '../schedule';


export class IntervalSchedule implements Schedule {
  public readonly startTime: number;
  public readonly interval: number;

  private _nextTime: number | null = null;

  public constructor(startTime: number, interval: number) {
    this.startTime = startTime;
    this.interval = interval;
  }

  public get scheduledTime(): number | null {
    return this._nextTime;
  }

  public scheduleNext(time: number): void {
    this._nextTime = Math.max(
      this.startTime,
      this.startTime + Math.ceil((time - this.startTime) / this.interval) * this.interval
    );
  }

  public clear(): void {
    this._nextTime = null;
  }
}
