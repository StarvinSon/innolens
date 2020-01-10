export interface Schedule {
  readonly scheduledTime: number | null;
  scheduleNext(time: number): void;
  clear(): void;
}
