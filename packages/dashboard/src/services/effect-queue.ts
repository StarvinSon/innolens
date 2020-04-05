export interface ApplyEffect {
  (effect?: () => void): void;
}

export interface EffectQueueTask<T> {
  (applyEffect: ApplyEffect): Promise<T>;
}

export class EffectQueue {
  private readonly _queues: Map<string, Array<ApplyEffect>> = new Map();

  public async queue<T>(key: string, task: EffectQueueTask<T>): Promise<T> {
    let queue = this._queues.get(key);
    if (queue === undefined) {
      queue = [];
      this._queues.set(key, queue);
    }

    const applyEffect: ApplyEffect = (effect) => {
      const currQueue = this._queues.get(key);
      if (currQueue === undefined) return;

      const effectOrder = currQueue.indexOf(applyEffect);
      if (effectOrder < 0) return;

      currQueue.splice(0, effectOrder + 1);
      if (currQueue.length === 0) {
        this._queues.delete(key);
      }
      effect?.();
    };
    queue.push(applyEffect);

    try {
      return await task(applyEffect);
    } finally {
      applyEffect();
    }
  }
}
