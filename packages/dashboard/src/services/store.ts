import { singleton, injectableConstructor } from '@innolens/resolver/web';
import {
  combineReducers, Store as ReduxStore, createStore as createReduxStore,
  ReducersMapObject
} from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/developmentOnly';

import { Reducer, AnyAction } from './state-types';


export interface StateUpdatedHandler<T> {
  (key: string): void;
}

type State = Readonly<Record<string, any>>;

@injectableConstructor()
@singleton()
export class Store {
  private readonly _reduxStore: ReduxStore<State, AnyAction>;
  private _reducerMap: ReducersMapObject<State, AnyAction>;

  private readonly _updateHandlers: Map<string, Set<StateUpdatedHandler<any>>> = new Map();
  private _lastGlobalState: State;

  public constructor() {
    this._onReduxStateUpdated = this._onReduxStateUpdated.bind(this);

    this._reduxStore = createReduxStore(
      (s = {}) => s,
      undefined,
      composeWithDevTools()
    );
    this._reducerMap = {};
    this._lastGlobalState = this._reduxStore.getState();
    this._reduxStore.subscribe(this._onReduxStateUpdated);
  }

  public getState<T>(key: string): T {
    return this._reduxStore.getState()[key];
  }

  public dispatch(action: AnyAction): void {
    this._reduxStore.dispatch(action);
  }

  public addReducer(key: string, reducer: Reducer<any>): void {
    this._reducerMap = {
      ...this._reducerMap,
      [key]: reducer
    };
    this._reduxStore.replaceReducer(combineReducers(this._reducerMap));
  }

  public addHandler<T>(key: string, handler: StateUpdatedHandler<T>): void {
    if (this._reduxStore.getState()[key] === undefined) {
      throw new Error(`Invalid key: ${key}`);
    }
    let handlers = this._updateHandlers.get(key);
    if (handlers === undefined) {
      handlers = new Set();
      this._updateHandlers.set(key, handlers);
    }
    handlers.add(handler);
  }

  private _onReduxStateUpdated(): void {
    const globalState = this._reduxStore.getState();
    if (this._lastGlobalState !== globalState) {
      for (const key of (Reflect.ownKeys(globalState) as Array<string>)) {
        if (
          this._lastGlobalState[key] === undefined
          || this._lastGlobalState[key] !== globalState[key]
        ) {
          const handlers = this._updateHandlers.get(key);
          if (handlers !== undefined) {
            for (const handler of handlers) {
              try {
                handler(key);
              } catch (err) {
                console.error(err);
              }
            }
          }
        }
      }
      this._lastGlobalState = globalState;
    }
  }
}
