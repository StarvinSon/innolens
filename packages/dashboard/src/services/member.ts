import * as Api from '@innolens/api/web';
import { injectableConstructor, singleton } from '@innolens/resolver';

import { mergeArray } from '../utils/immutable/array';
import { mergeObject } from '../utils/immutable/object';
import { mergeObjectMap } from '../utils/immutable/object-map';

import { ServerClient } from './server-client';
import { Action, AnyAction } from './state-types';
import { Store } from './store';


export type MemberCountHistory = Api.Members.GetCountHistory.Response;

export type MemberCountHistoryCategory = Api.Members.GetCountHistory.Category;

export type MemberCountHistoryRange = Api.Members.GetCountHistory.Range;


export interface MemberServiceState {
  readonly countHistoryCategory: MemberCountHistoryCategory | null;
  readonly countHistoryRange: MemberCountHistoryRange | null;
  readonly countHistory: MemberCountHistory | null;
}


const SET_COUNT_HISTORY_ACTION_TYPE = 'member/count-history/SET';
interface SetCountHistoryAction extends Action<typeof SET_COUNT_HISTORY_ACTION_TYPE> {
  readonly countHistoryCategory: MemberCountHistoryCategory;
  readonly countHistoryRange: MemberCountHistoryRange;
  readonly countHistory: MemberCountHistory;
}

declare global {
  namespace App {
    interface ActionMap {
      [SET_COUNT_HISTORY_ACTION_TYPE]: SetCountHistoryAction;
    }
  }
}


const KEY = 'member';

@injectableConstructor(Store, ServerClient)
@singleton()
export class MemberService extends EventTarget {
  private readonly _store: Store;
  private readonly _serverClient: ServerClient;

  private _countHistoryUpdateState: {
    readonly type: 'idle';
  } | {
    readonly type: 'updating';
    readonly category: MemberCountHistoryCategory;
    readonly range: MemberCountHistoryRange;
    readonly promise: Promise<MemberCountHistory>;
  } = {
    type: 'idle'
  };

  public constructor(store: Store, oauth2Service: ServerClient) {
    super();
    this._store = store;
    this._serverClient = oauth2Service;
    store.addReducer(KEY, this._reduce.bind(this));
  }

  private get _state(): MemberServiceState {
    return this._store.getState(KEY);
  }

  public getCountHistory(
    category: MemberCountHistoryCategory,
    range: MemberCountHistoryRange
  ): MemberCountHistory | null {
    if (
      this._state.countHistoryCategory === category
      && this._state.countHistoryRange === range
      && this._state.countHistory !== null
    ) {
      return this._state.countHistory;
    }
    return null;
  }

  public async updateCountHistory(
    category: MemberCountHistoryCategory,
    range: MemberCountHistoryRange
  ): Promise<MemberCountHistory> {
    if (
      this._countHistoryUpdateState.type === 'updating'
      && this._countHistoryUpdateState.category === category
      && this._countHistoryUpdateState.range === range
    ) {
      return this._countHistoryUpdateState.promise;
    }

    const promise = Promise.resolve().then(async () => {
      const url = new URL(Api.Members.GetCountHistory.path, globalThis.location.href);
      url.searchParams.append('category', category);
      url.searchParams.append('range', range);
      const json = await this._serverClient.fetchJsonOk(url.href, {
        cache: 'no-store'
      });
      const body = Api.Members.GetCountHistory.fromResponseJson(json);
      this._store.dispatch({
        type: SET_COUNT_HISTORY_ACTION_TYPE,
        countHistoryCategory: category,
        countHistoryRange: range,
        countHistory: body
      });
      return body;
    });

    const updateState: MemberService['_countHistoryUpdateState'] = {
      type: 'updating',
      category,
      range,
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

  public async importMembers(file: File): Promise<void> {
    const form = new FormData();
    form.set('file', file);
    await this._serverClient.fetchOk(Api.Members.PostMembers.path, {
      method: 'POST',
      body: form
    });
  }

  private _reduce(
    state: MemberServiceState = {
      countHistoryCategory: null,
      countHistoryRange: null,
      countHistory: null
    },
    action: AnyAction
  ): MemberServiceState {
    switch (action.type) {
      case SET_COUNT_HISTORY_ACTION_TYPE: {
        return mergeObject(
          state,
          {
            countHistoryCategory: action.countHistoryCategory,
            countHistoryRange: action.countHistoryRange,
            countHistory: mergeObject(
              state.countHistory,
              {
                ...action.countHistory,
                records: mergeArray(
                  state.countHistory?.records,
                  action.countHistory.records,
                  (oldRecord, newRecord) => mergeObject(
                    oldRecord,
                    {
                      ...newRecord,
                      counts: mergeObjectMap(oldRecord?.counts, newRecord.counts)
                    }
                  )
                )
              }
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
