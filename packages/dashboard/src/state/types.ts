import { Action as ReduxAction, Reducer as ReduxReducer } from 'redux';

import { DependencyCreator } from '../context';


declare global {
  namespace App {
    interface ActionMap {}
  }
}

export interface Action<T extends string> extends ReduxAction<T> {
  readonly type: T;
}

export type AnyAction = App.ActionMap[keyof App.ActionMap];

export type Reducer<S> = ReduxReducer<S, AnyAction>;


export type ActionsCreator<T, S> = DependencyCreator<T, [() => S]>;
