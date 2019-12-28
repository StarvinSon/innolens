import { createToken, createSingletonDependencyRegistrant } from '../context';
import { migrateArray } from '../utils/immutable/array';
import { mergeObject } from '../utils/immutable/object';

import { Action, Reducer, ActionsCreator } from './types';
import { OAuth2Actions } from './oauth2';


export type MemberGroupsState = ReadonlyArray<MemberGroup>;

export interface MemberGroup {
  readonly name: string;
  readonly count: number;
}


const SET_MEMBER_GROUPS_ACTION_TYPE = 'member-groups/SET';
interface SetMemberGroupsAction extends Action<typeof SET_MEMBER_GROUPS_ACTION_TYPE> {
  readonly memberGroups: ReadonlyArray<MemberGroup>;
}

const CLEAR_MEMBER_GROUPS_ACTION_TYPE = 'member-groups/CLEAR';
interface ClearMemberGroupsAction extends Action<typeof CLEAR_MEMBER_GROUPS_ACTION_TYPE> {}

declare global {
  namespace App {
    interface ActionMap {
      [SET_MEMBER_GROUPS_ACTION_TYPE]: SetMemberGroupsAction;
      [CLEAR_MEMBER_GROUPS_ACTION_TYPE]: ClearMemberGroupsAction;
    }
  }
}


const initialState: MemberGroupsState = [];

// eslint-disable-next-line max-len
export const reduceMemberGroupsState: Reducer<MemberGroupsState> = (state = initialState, action) => {
  switch (action.type) {
    case SET_MEMBER_GROUPS_ACTION_TYPE: {
      return migrateArray<MemberGroup>(state, action.memberGroups, mergeObject);
    }
    case CLEAR_MEMBER_GROUPS_ACTION_TYPE: {
      return migrateArray<MemberGroup>(state, [], mergeObject);
    }
    default: {
      return state;
    }
  }
};


export interface MemberGroupsActions {
  get(): ReadonlyArray<MemberGroup>;
  set(memberGroups: ReadonlyArray<MemberGroup>): void;
  clear(): void;
  update(): Promise<void>;
}

export const MemberGroupsActions = createToken<MemberGroupsActions>(module.id, 'MemberGroupsActions');

// eslint-disable-next-line max-len
export const createMemberGroupsActions: ActionsCreator<MemberGroupsActions, MemberGroupsState> = (ctx, getState) => {
  const oauth2TokenActions = ctx.resolve(OAuth2Actions);

  const get: MemberGroupsActions['get'] = () =>
    getState();

  const set: MemberGroupsActions['set'] = (memberGroups) => {
    ctx.dispatchAction({
      type: SET_MEMBER_GROUPS_ACTION_TYPE,
      memberGroups
    });
  };

  const clear: MemberGroupsActions['clear'] = () => {
    ctx.dispatchAction({
      type: CLEAR_MEMBER_GROUPS_ACTION_TYPE
    });
  };

  const update: MemberGroupsActions['update'] = async () => {
    const res = await fetch('/api/member-groups', {
      headers: { Authorization: `Bearer ${await oauth2TokenActions.getAccessToken()}` },
      cache: 'no-store'
    });
    if (!res.ok) {
      throw new Error(`Request failed with status code ${res.status}`);
    }
    const resBody = await res.json();
    set(resBody);
  };

  return {
    get,
    set,
    clear,
    update
  };
};

// eslint-disable-next-line max-len
export const registerMemberGroupsActions = createSingletonDependencyRegistrant(MemberGroupsActions, createMemberGroupsActions);
