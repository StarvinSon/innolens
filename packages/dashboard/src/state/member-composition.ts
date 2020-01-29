import { createToken, createSingletonDependencyRegistrant } from '../context';
import { migrateArray } from '../utils/immutable/array';
import { mergeObject } from '../utils/immutable/object';

import { Action, Reducer, ActionsCreator } from './types';
import { OAuth2Actions } from './oauth2';


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
interface ClearMemberCompositionAction extends Action<typeof CLEAR_MEMBER_COMPOSITION_ACTION_TYPE> {}

declare global {
  namespace App {
    interface ActionMap {
      [SET_MEMBER_COMPOSITIONS_ACTION_TYPE]: SetMemberCompositionAction;
      [CLEAR_MEMBER_COMPOSITION_ACTION_TYPE]: ClearMemberCompositionAction;
    }
  }
}


const initialState: MemberCompositionState = null;

// eslint-disable-next-line max-len
export const reduceMemberCompositionState: Reducer<MemberCompositionState> = (state = initialState, action) => {
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
};


export interface MemberCompositionActions {
  get(): MemberCompositionState;
  set(memberComposition: MemberComposition): void;
  clear(): void;
  update(): Promise<void>;
}

export const MemberCompositionActions = createToken<MemberCompositionActions>(module.id, 'MemberCompositionActions');

// eslint-disable-next-line max-len
export const createMemberCompositionActions: ActionsCreator<MemberCompositionActions, MemberCompositionState> = (ctx, getState) => {
  const oauth2TokenActions = ctx.resolve(OAuth2Actions);

  const get: MemberCompositionActions['get'] = () =>
    getState();

  const set: MemberCompositionActions['set'] = (memberComposition) => {
    ctx.dispatchAction({
      type: SET_MEMBER_COMPOSITIONS_ACTION_TYPE,
      memberComposition
    });
  };

  const clear: MemberCompositionActions['clear'] = () => {
    ctx.dispatchAction({
      type: CLEAR_MEMBER_COMPOSITION_ACTION_TYPE
    });
  };

  const update: MemberCompositionActions['update'] = async () => {
    const res = await fetch('/api/member-compositions?latest', {
      headers: { Authorization: `Bearer ${await oauth2TokenActions.getAccessToken()}` },
      cache: 'no-store'
    });
    if (!res.ok) {
      throw new Error(`Request failed with status code ${res.status}`);
    }
    const { data } = await res.json();
    set(data);
  };

  return {
    get,
    set,
    clear,
    update
  };
};

// eslint-disable-next-line max-len
export const registerMemberCompositionActions = createSingletonDependencyRegistrant(MemberCompositionActions, createMemberCompositionActions);
