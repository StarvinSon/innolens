import { createToken, injectableConstructor, singleton } from '@innolens/resolver';

import { Action, AnyAction } from './state-types';
import { Store } from './store';


export interface PathService {
  readonly path: string;
  set(path: string): void;
}

export const PathService = createToken<PathService>('PathService');


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


const KEY = 'path';

@injectableConstructor(Store)
@singleton()
export class PathServiceImpl implements PathService {
  private readonly _store: Store;

  public constructor(store: Store) {
    this._store = store;
    store.addReducer(KEY, this._reduce.bind(this));
  }

  public get path(): string {
    return this._store.getState(KEY);
  }

  public set(path: string): void {
    this._store.dispatch({
      type: 'path/SET',
      path
    });
  }

  private _reduce(state: string = '', action: AnyAction): string {
    switch (action.type) {
      case SET_PATH_ACTION_TYPE: {
        return action.path;
      }
      default: {
        return state;
      }
    }
  }
}