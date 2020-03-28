import * as Api from '@innolens/api/web';
import { injectableConstructor, singleton } from '@innolens/resolver';

import { mergeArray } from '../utils/immutable/array';
import { mergeObject } from '../utils/immutable/object';

import { ServerClient } from './server-client';
import { Action, AnyAction } from './state-types';
import { Store } from './store';


export interface Space {
  readonly spaceId: string;
  readonly spaceName: string;
}

export interface SpaceServiceState {
  readonly spaces: ReadonlyArray<Space> | null;
}


const SET_SPACES_ACTION_TYPE = 'space/spaces/SET';
interface SetSpacesAction extends Action<typeof SET_SPACES_ACTION_TYPE> {
  readonly spaces: ReadonlyArray<Space>;
}

declare global {
  namespace App {
    interface ActionMap {
      [SET_SPACES_ACTION_TYPE]: SetSpacesAction;
    }
  }
}


const KEY = 'space';

@injectableConstructor(Store, ServerClient)
@singleton()
export class SpaceService extends EventTarget {
  private readonly _store: Store;
  private readonly _serverClient: ServerClient;

  private _countHistoryUpdateState: {
    readonly type: 'idle';
  } | {
    readonly type: 'updating';
    readonly promise: Promise<ReadonlyArray<Space>>;
  } = {
    type: 'idle'
  };

  public constructor(store: Store, oauth2Service: ServerClient) {
    super();
    this._store = store;
    this._serverClient = oauth2Service;
    store.addReducer(KEY, this._reduce.bind(this));
  }

  private get _state(): SpaceServiceState {
    return this._store.getState(KEY);
  }

  public get spaces(): ReadonlyArray<Space> | null {
    return this._state.spaces;
  }

  public async updateSpaces(): Promise<ReadonlyArray<Space>> {
    if (this._countHistoryUpdateState.type === 'updating') {
      return this._countHistoryUpdateState.promise;
    }

    const promise = Promise.resolve().then(async () => {
      const json = await this._serverClient.fetchJsonOk(
        Api.Spaces.GetSpaces.path,
        {
          cache: 'no-store'
        }
      );
      const body = Api.Spaces.GetSpaces.fromResponseJson(json);
      this._store.dispatch({
        type: SET_SPACES_ACTION_TYPE,
        spaces: body
      });
      return body;
    });

    const updateState: SpaceService['_countHistoryUpdateState'] = {
      type: 'updating',
      promise
    };
    this._countHistoryUpdateState = updateState;
    try {
      return await this._countHistoryUpdateState.promise;
    } finally {
      if (this._countHistoryUpdateState === updateState) {
        this._countHistoryUpdateState = {
          type: 'idle'
        };
      }
    }
  }

  public async importSpaces(file: File): Promise<void> {
    const form = new FormData();
    form.set('file', file);
    await this._serverClient.fetchOk(
      Api.Spaces.PostSpaces.path,
      {
        method: 'POST',
        body: form
      }
    );
  }

  private _reduce(
    state: SpaceServiceState = {
      spaces: null
    },
    action: AnyAction
  ): SpaceServiceState {
    switch (action.type) {
      case SET_SPACES_ACTION_TYPE: {
        return mergeObject(
          state,
          {
            spaces: mergeArray<Space>(
              state.spaces,
              action.spaces,
              mergeObject
            )
          }
        );
      }
      default: {
        return state;
      }
    }
  }
}
