export class Debouncer {
  private readonly _updatingPromises: Map<string, Promise<any>> = new Map();

  public async debounce<T>(key: string, task: () => Promise<T>): Promise<T> {
    let promise: Promise<T> | undefined = this._updatingPromises.get(key);
    if (promise !== undefined) {
      return promise;
    }
    promise = Promise.resolve().then(async () => task());
    this._updatingPromises.set(key, promise);
    try {
      return await promise;
    } finally {
      if (this._updatingPromises.get(key) === promise) {
        this._updatingPromises.delete(key);
      }
    }
  }
}
