import { Context } from '../../context';
import { State } from '../../state';
import { autoBind } from '../../utils/bind';


interface CustomElement extends HTMLElement{
  connectedCallback?(): void;
  disconnectedCallback?(): void;
  readonly isConnected: boolean;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const connectContext = <T extends (new (...args: Array<any>) => CustomElement)>(base: T) => {
  class ObserveStateMixin extends base {
    private _context: Context | null = null;

    public get context(): Context | null {
      return this._context;
    }

    public set context(newVal: Context | null) {
      this._context = newVal;
      this._updateContextConnection();
    }

    private _connectedContext: Context | null = null;

    protected get connectedContext(): Context | null {
      return this._connectedContext;
    }

    protected getConnectedContext(): Context {
      const ctx = this._connectedContext;
      if (ctx === null) {
        throw new Error('No context is connected');
      }
      return ctx;
    }

    public connectedCallback(): void {
      super.connectedCallback?.();
      this._updateContextConnection();
    }

    public disconnectedCallback(): void {
      super.disconnectedCallback?.();
      this._updateContextConnection();
    }

    private _updateContextConnection(): void {
      const {
        isConnected,
        _connectedContext: connectedContext,
        _context: context
      } = this;

      if (connectedContext !== context || isConnected !== (connectContext !== null)) {
        if (connectedContext !== null) {
          this.onContextDisconnected(connectedContext);
          this._connectedContext = null;
        }
        if (isConnected && context !== null) {
          this._connectedContext = context;
          this.onContextConnected(context);
        }
      }
    }

    protected onContextConnected(context: Context): void {
      context.addEventListener('state-changed', this._contextStateChangedEventHandler);
      this._contextStateChanged();
    }

    protected onContextDisconnected(context: Context): void {
      context.removeEventListener('state-changed', this._contextStateChangedEventHandler);
    }

    @autoBind()
    private _contextStateChangedEventHandler(): void {
      this._contextStateChanged();
    }

    private _contextStateChanged(): void {
      const { connectedContext } = this;
      if (connectedContext !== null) {
        this.onContextStateChanged(connectedContext.state);
      }
    }

    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
    public onContextStateChanged(state: State): void {}
  }

  return ObserveStateMixin;
};
