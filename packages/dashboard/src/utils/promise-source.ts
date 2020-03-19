export class PromiseSource<T> {
  public static resolve(): PromiseSource<void>;
  public static resolve<T>(val: T | PromiseLike<T>): PromiseSource<T>;
  public static resolve<T>(val?: any): PromiseSource<T> {
    const source = new PromiseSource<T>();
    source.resolve(val);
    return source;
  }


  public readonly promise: Promise<T>;

  private _settled = false;

  private _resolvePromise!: (val: T | PromiseLike<T>) => void;
  private _rejectPromise!: (err: unknown) => void;

  public constructor() {
    this.promise = new Promise<T>((rs, rj) => {
      this._resolvePromise = rs;
      this._rejectPromise = rj;
    });
  }

  public get settled(): boolean {
    return this._settled;
  }

  public resolve(this: PromiseLike<void>, val?: PromiseLike<void>): void;
  public resolve(val: T | PromiseLike<T>): void;
  public resolve(val?: any): void {
    this._settled = true;
    this._resolvePromise(val);
  }

  public reject(err: unknown): void {
    this._settled = true;
    this._rejectPromise(err);
  }
}
