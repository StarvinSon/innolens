import { injectableConstructor, singleton, createToken } from '@innolens/resolver';

import { migrateArray } from '../utils/immutable/array';
import { mergeObject } from '../utils/immutable/object';

import { ServerClient } from './server-client';
import { Action, AnyAction } from './state-types';
import { Store } from './store';


export interface MemberCompositionService extends EventTarget {
  readonly memberComposition: MemberCompositionState;
  clear(): void;
  update(): Promise<void>;
}

export const MemberCompositionService = createToken<MemberCompositionService>('MemberCompositionService');

export type MemberCompositionState = MemberComposition | null;

export interface MemberComposition {
  readonly time: Date;
  readonly perspectives: ReadonlyArray<MemberCompositionPerspective>;
}

export interface MemberCompositionPerspective {
  readonly type: string;
  readonly groups: ReadonlyArray<MemberCompositionGroup>
}

export interface MemberCompositionGroup {
  readonly type: string;
  readonly count: number;
}


const SET_MEMBER_COMPOSITIONS_ACTION_TYPE = 'member-composition/SET';
interface SetMemberCompositionAction extends Action<typeof SET_MEMBER_COMPOSITIONS_ACTION_TYPE> {
  readonly memberComposition: MemberComposition;
}

const CLEAR_MEMBER_COMPOSITION_ACTION_TYPE = 'member-composition/CLEAR';
// eslint-disable-next-line max-len
interface ClearMemberCompositionAction extends Action<typeof CLEAR_MEMBER_COMPOSITION_ACTION_TYPE> {}

declare global {
  namespace App {
    interface ActionMap {
      [SET_MEMBER_COMPOSITIONS_ACTION_TYPE]: SetMemberCompositionAction;
      [CLEAR_MEMBER_COMPOSITION_ACTION_TYPE]: ClearMemberCompositionAction;
    }
  }
}


const KEY = 'memberComposition';

const initialState: MemberCompositionState = null;

@injectableConstructor(Store, ServerClient)
@singleton()
export class MemberCompositionServiceImpl extends EventTarget implements MemberCompositionService {
  private readonly _store: Store;
  private readonly _serverClient: ServerClient;

  public constructor(store: Store, oauth2Service: ServerClient) {
    super();
    this._store = store;
    this._serverClient = oauth2Service;
    store.addReducer(KEY, this._reduce.bind(this));
  }

  private _getState(): MemberCompositionState {
    return this._store.getState(KEY);
  }

  public get memberComposition(): MemberCompositionState {
    return this._getState();
  }

  private _setMemberComposition(memberComposition: MemberComposition): void {
    this._store.dispatch({
      type: SET_MEMBER_COMPOSITIONS_ACTION_TYPE,
      memberComposition
    });
    this.dispatchEvent(new CustomEvent('changed'));
  }

  public clear(): void {
    this._store.dispatch({
      type: CLEAR_MEMBER_COMPOSITION_ACTION_TYPE
    });
    this.dispatchEvent(new CustomEvent('changed'));
  }

  public async update(): Promise<void> {
    const res = await this._serverClient.fetchOk('/api/member-compositions?latest', {
      cache: 'no-store'
    });
    const { data } = await res.json();
    this._setMemberComposition(data);
  }

  private _reduce(
    state: MemberCompositionState = initialState,
    action: AnyAction
  ): MemberCompositionState {
    switch (action.type) {
      case SET_MEMBER_COMPOSITIONS_ACTION_TYPE: {
        return mergeObject(state, {
          ...action.memberComposition,
          // eslint-disable-next-line max-len
          perspectives: migrateArray(state?.perspectives, action.memberComposition.perspectives, (tp, sp) =>
            mergeObject(tp, {
              ...sp,
              groups: migrateArray(tp?.groups, sp.groups, (tg, sg) =>
                mergeObject(tg, sg))
            }))
        });
      }
      case CLEAR_MEMBER_COMPOSITION_ACTION_TYPE: {
        return null;
      }
      default: {
        return state;
      }
    }
  }
}
