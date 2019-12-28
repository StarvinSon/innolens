import { DependencyContainer, container as rootContainer, instanceCachingFactory } from 'tsyringe';

import {
  Context, StateChangedEvent, ResolveAllResult,
  ResolveAllAsyncResult, DependencyCreator, Token, TokenOrCreator
} from './context';
import {
  Store, AnyAction, State, registerActions, registerStore
} from './state';
import { autoBind } from './utils/bind';


class ContextImpl extends EventTarget implements Context {
  private readonly _dependencyContainer: DependencyContainer = rootContainer.createChildContainer();

  private readonly _store: Store;

  public get state(): State {
    return this._store.getState();
  }

  public constructor() {
    super();

    registerStore(this);
    registerActions(this, () => this.state);

    this._store = this.resolve(Store);
    this._store.subscribe(this.onStateChanged);
  }

  public dispatchAction<T extends AnyAction>(action: T): T {
    return this._store.dispatch(action);
  }

  @autoBind()
  protected onStateChanged(): void {
    this.dispatchEvent(new StateChangedEvent());
  }

  public resolve<T>(token: TokenOrCreator<T>): T {
    const { _dependencyContainer: container } = this;
    if (typeof token === 'function') {
      return token(this);
    }
    return container.resolve(token as any);
  }

  // eslint-disable-next-line max-len
  public resolveAll<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): ResolveAllResult<T> {
    return tokens.map((t) => this.resolve(t)) as any;
  }

  // eslint-disable-next-line max-len
  public async resolveAllAsync<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): ResolveAllAsyncResult<T> {
    return Promise.all(this.resolveAll(...tokens)) as any;
  }

  public registerSingleton<T>(token: Token<T>, creator: DependencyCreator<T>): void {
    const { _dependencyContainer: container } = this;
    container.register(token as any, {
      useFactory: instanceCachingFactory(() => creator(this))
    });
  }
}

export const createContext = (): Context => new ContextImpl();
