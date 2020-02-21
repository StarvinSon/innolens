import { Action as ReduxAction, Reducer as ReduxReducer } from 'redux';


declare global {
  namespace App {
    interface ActionMap {}
  }
}

export interface Action<T extends string> extends ReduxAction<T> {
  readonly type: T;
}

export type AnyAction = App.ActionMap[keyof App.ActionMap];

export interface Reducer<S> extends ReduxReducer<S, AnyAction> {}
