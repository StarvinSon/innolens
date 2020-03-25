import { singleton, injectableConstructor } from '@innolens/resolver';
import {
  combineReducers, Store as ReduxStore, createStore as createReduxStore,
  ReducersMapObject
} from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension/developmentOnly';

import { Reducer, AnyAction } from './state-types';


type State = Readonly<Record<string, any>>;

@injectableConstructor()
@singleton()
export class Store {
  private readonly _reduxStore: ReduxStore<State, AnyAction>;
  private _reducerMap: ReducersMapObject<any, AnyAction>;

  public constructor() {
    this._reduxStore = createReduxStore(
      (s = {}) => s,
      undefined,
      composeWithDevTools()
    );
    this._reducerMap = {};
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
}
