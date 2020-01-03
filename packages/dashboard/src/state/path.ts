import { createToken, createSingletonDependencyRegistrant } from '../context';

import { Action, Reducer, ActionsCreator } from './types';


export type PathState = string;


const SET_PATH_ACTION_TYPE = 'path/SET';
interface SetPathAction extends Action<typeof SET_PATH_ACTION_TYPE> {
  readonly path: string;
}

declare global {
  namespace App {
    interface ActionMap {
      [SET_PATH_ACTION_TYPE]: SetPathAction;
    }
  }
}


const initialState: PathState = '';

export const reducePathState: Reducer<PathState> = (state = initialState, action) => {
  switch (action.type) {
    case SET_PATH_ACTION_TYPE: {
      return action.path;
    }
    default: {
      return state;
    }
  }
};


export interface PathActions {
  get(): string;
  set(path: string): void;
}

export const PathActions = createToken<PathActions>(module.id, 'PathActions');

export const createPathActions: ActionsCreator<PathActions, PathState> = (ctx, getState) => {
  const get: PathActions['get'] = () =>
    getState();

  const set: PathActions['set'] = (path) => {
    ctx.dispatchAction({
      type: 'path/SET',
      path
    });
  };

  return {
    get,
    set
  };
};

// eslint-disable-next-line max-len
export const registerPathActions = createSingletonDependencyRegistrant(PathActions, createPathActions);
