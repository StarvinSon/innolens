import * as Api from '@innolens/api-legacy/lib-web';
import { injectableConstructor, singleton } from '@innolens/resolver/lib-web';

import { mergeArray } from '../utils/immutable/array';
import { mergeObject } from '../utils/immutable/object';
import { mergeObjectMap } from '../utils/immutable/object-map';
import { PromiseValue } from '../utils/promise';

import * as MemberGlue from './glues/member';
import { OAuth2Service } from './oauth2';
import { ServerService } from './server';
import { Action, AnyAction } from './state-types';
import { Store } from './store';


export type Member = PromiseValue<ReturnType<typeof MemberGlue.GetMembers.handleResponse>>[number];


export interface MemberCountFilter {
  readonly department?: ReadonlyArray<string>;
  readonly typeOfStudy?: ReadonlyArray<string>;
  readonly yearOfStudy?: ReadonlyArray<string>;
  readonly studyProgramme?: ReadonlyArray<string>;
  readonly affiliatedStudentInterestGroup?: ReadonlyArray<string>;
}

export type MemberCountHistory = Api.Members.GetCountHistory.ResponseBody['data'];

export type MemberCountHistoryCategory = Api.Members.GetCountHistory.Category;

export type MemberCountHistoryRange = Api.Members.GetCountHistory.Range;


interface MemberServiceState {
  readonly departments: ReadonlyArray<string> | null;
  readonly typesOfStudy: ReadonlyArray<string> | null;
  readonly studyProgrammes: ReadonlyArray<string> | null;
  readonly yearsOfStudy: ReadonlyArray<string> | null;
  readonly affiliatedStudentInterestGroups: ReadonlyArray<string> | null;

  readonly countQuery: string | null;
  readonly count: number | null;

  readonly countHistoryCategory: MemberCountHistoryCategory | null;
  readonly countHistoryRange: MemberCountHistoryRange | null;
  readonly countHistory: MemberCountHistory | null;
}


const SET_DEPARTMENTS_ACTION_TYPE = 'member/departments/SET';
interface SetDepartmentsAction extends Action<typeof SET_DEPARTMENTS_ACTION_TYPE> {
  readonly departments: ReadonlyArray<string>;
}

const SET_TYPES_OF_STUDY_ACTION_TYPE = 'member/types-of-study/SET';
interface SetTypesOfStudyAction extends Action<typeof SET_TYPES_OF_STUDY_ACTION_TYPE> {
  readonly typesOfStudy: ReadonlyArray<string>;
}

const SET_STUDY_PROGRAMMES_ACTION_TYPE = 'member/study-programmes/SET';
interface SetStudyProgrammesAction extends Action<typeof SET_STUDY_PROGRAMMES_ACTION_TYPE> {
  readonly studyProgrammes: ReadonlyArray<string>;
}

const SET_YEARS_OF_STUDY_ACTION_TYPE = 'member/years-of-study/SET';
interface SetYearsOfStudyAction extends Action<typeof SET_YEARS_OF_STUDY_ACTION_TYPE> {
  readonly yearsOfStudy: ReadonlyArray<string>;
}

const SET_AFFILIATED_STUDENT_INTEREST_GROUPS_ACTION_TYPE = 'member/affiliated-study-interest-groups/SET';
// eslint-disable-next-line max-len
interface SetAffiliatedStudentInterestGroupsAction extends Action<typeof SET_AFFILIATED_STUDENT_INTEREST_GROUPS_ACTION_TYPE> {
  readonly affiliatedStudentInterestGroups: ReadonlyArray<string>;
}

const SET_MEMBER_COUNT_ACTION_TYPE = 'member/count/SET';
interface SetCountAction extends Action<typeof SET_MEMBER_COUNT_ACTION_TYPE> {
  readonly countQuery: string;
  readonly count: number;
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
      [SET_DEPARTMENTS_ACTION_TYPE]: SetDepartmentsAction;
      [SET_TYPES_OF_STUDY_ACTION_TYPE]: SetTypesOfStudyAction;
      [SET_STUDY_PROGRAMMES_ACTION_TYPE]: SetStudyProgrammesAction;
      [SET_YEARS_OF_STUDY_ACTION_TYPE]: SetYearsOfStudyAction;
      // eslint-disable-next-line max-len
      [SET_AFFILIATED_STUDENT_INTEREST_GROUPS_ACTION_TYPE]: SetAffiliatedStudentInterestGroupsAction;
      [SET_MEMBER_COUNT_ACTION_TYPE]: SetCountAction;
      [SET_COUNT_HISTORY_ACTION_TYPE]: SetCountHistoryAction;
    }
  }
}


const KEY = 'member';

@injectableConstructor(Store, ServerService, OAuth2Service)
@singleton()
export class MemberService extends EventTarget {
  private readonly _store: Store;
  private readonly _serverClient: ServerService;
  private readonly _oauth2Service: OAuth2Service;

  private readonly _updatingPromises: Map<string, Promise<any>> = new Map();

  public constructor(store: Store, serverService: ServerService, oauth2Service: OAuth2Service) {
    super();
    this._reduce = this._reduce.bind(this);
    this._onStateUpdated = this._onStateUpdated.bind(this);

    this._store = store;
    this._serverClient = serverService;
    this._oauth2Service = oauth2Service;
    store.addReducer(KEY, this._reduce);
    store.addHandler(KEY, this._onStateUpdated);
  }

  private get _state(): MemberServiceState {
    return this._store.getState(KEY);
  }

  private _onStateUpdated(): void {
    this.dispatchEvent(new Event('state-updated'));
  }

  public get departments(): ReadonlyArray<string> | null {
    return this._state.departments;
  }

  public get typesOfStudy(): ReadonlyArray<string> | null {
    return this._state.typesOfStudy;
  }

  public get studyProgrammes(): ReadonlyArray<string> | null {
    return this._state.studyProgrammes;
  }

  public get yearsOfStudy(): ReadonlyArray<string> | null {
    return this._state.yearsOfStudy;
  }

  public get affiliatedStudentInterestGroups(): ReadonlyArray<string> | null {
    return this._state.affiliatedStudentInterestGroups;
  }

  public getCount(filter: MemberCountFilter): number | null {
    const query = this._getCountQuery(filter);
    if (this._state.countQuery === query) {
      return this._state.count;
    }
    return null;
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

  public async updateDepartments(): Promise<ReadonlyArray<string>> {
    return this._performTask('departments', async () => {
      const json = await this._serverClient.fetchJsonOk(Api.Members.GetDepartments.path);
      const { data } = Api.Members.GetDepartments.fromResponseBodyJson(json);
      this._store.dispatch({
        type: 'member/departments/SET',
        departments: data
      });
      return data;
    });
  }

  public async updateTypesOfStudy(): Promise<ReadonlyArray<string>> {
    return this._performTask('typesOfStudy', async () => {
      const json = await this._serverClient.fetchJsonOk(Api.Members.GetTypesOfStudy.path);
      const { data } = Api.Members.GetTypesOfStudy.fromResponseBodyJson(json);
      this._store.dispatch({
        type: 'member/types-of-study/SET',
        typesOfStudy: data
      });
      return data;
    });
  }

  public async updateStudyProgrammes(): Promise<ReadonlyArray<string>> {
    return this._performTask('studyProgrammes', async () => {
      const json = await this._serverClient.fetchJsonOk(Api.Members.GetStudyProgrammes.path);
      const { data } = Api.Members.GetStudyProgrammes.fromResponseBodyJson(json);
      this._store.dispatch({
        type: 'member/study-programmes/SET',
        studyProgrammes: data
      });
      return data;
    });
  }

  public async updateYearsOfStudy(): Promise<ReadonlyArray<string>> {
    return this._performTask('yearsOfStudy', async () => {
      const json = await this._serverClient.fetchJsonOk(Api.Members.GetYearsOfStudy.path);
      const { data } = Api.Members.GetYearsOfStudy.fromResponseBodyJson(json);
      this._store.dispatch({
        type: 'member/years-of-study/SET',
        yearsOfStudy: data
      });
      return data;
    });
  }

  public async updateAffiliatedStudentInterestGroups(): Promise<ReadonlyArray<string>> {
    return this._performTask('affiliatedStudentInterestGroups', async () => {
      const json = await this._serverClient
        .fetchJsonOk(Api.Members.GetAffiliatedStudentInterestGroups.path);
      const { data } = Api.Members.GetAffiliatedStudentInterestGroups.fromResponseBodyJson(json);
      this._store.dispatch({
        type: 'member/affiliated-study-interest-groups/SET',
        affiliatedStudentInterestGroups: data
      });
      return data;
    });
  }

  public async fetchMembers(opts: {
    readonly memberIds: ReadonlyArray<string>;
  }): Promise<ReadonlyArray<Member>> {
    return this._oauth2Service
      .withAccessToken((token) => fetch(MemberGlue.GetMembers.createRequest({
        authentication: { token },
        body: {
          memberIds: opts.memberIds
        }
      })))
      .then(MemberGlue.GetMembers.handleResponse);
  }

  public async updateCount(filter: MemberCountFilter): Promise<number> {
    const query = this._getCountQuery(filter);
    return this._performTask(`count?${query}`, async () => {
      const url = new URL(Api.Members.GetCount.path, globalThis.location.href);
      url.search = query;
      const json = await this._serverClient.fetchJsonOk(url.href, {
        cache: 'no-store'
      });
      const { data } = Api.Members.GetCount.fromResponseBodyJson(json);
      this._store.dispatch({
        type: SET_MEMBER_COUNT_ACTION_TYPE,
        countQuery: query,
        count: data
      });
      return data;
    });
  }

  private _getCountQuery(filter: MemberCountFilter): string {
    const params = new URLSearchParams();
    const keys = [
      'department',
      'typeOfStudy',
      'yearOfStudy',
      'studyProgramme',
      'affiliatedStudentInterestGroup'
    ] as const;
    for (const key of keys) {
      const arr = filter[key];
      if (arr !== undefined) {
        const val = arr.map(globalThis.encodeURIComponent).join(',');
        params.set(key, val);
      }
    }
    return params.toString();
  }

  public async updateCountHistory(
    category: MemberCountHistoryCategory,
    range: MemberCountHistoryRange
  ): Promise<MemberCountHistory> {
    const key = `category=${globalThis.encodeURIComponent(category)},range=${globalThis.encodeURIComponent(range)}`;
    return this._performTask(key, async () => {
      const url = new URL(Api.Members.GetCountHistory.path, globalThis.location.href);
      url.searchParams.append('category', category);
      url.searchParams.append('range', range);
      const json = await this._serverClient.fetchJsonOk(url.href, {
        cache: 'no-store'
      });
      const { data } = Api.Members.GetCountHistory.fromResponseBodyJson(json);
      this._store.dispatch({
        type: SET_COUNT_HISTORY_ACTION_TYPE,
        countHistoryCategory: category,
        countHistoryRange: range,
        countHistory: data
      });
      return data;
    });
  }

  private async _performTask<T>(key: string, task: () => Promise<T>): Promise<T> {
    let promise: Promise<T> | undefined = this._updatingPromises.get(key);
    if (promise !== undefined) {
      return promise;
    }
    promise = Promise.resolve().then(async () => task());
    this._updatingPromises.set(key, promise);
    try {
      return await promise;
    } finally {
      if (this._updatingPromises.get(key) === promise) {
        this._updatingPromises.delete(key);
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
      departments: null,
      typesOfStudy: null,
      studyProgrammes: null,
      yearsOfStudy: null,
      affiliatedStudentInterestGroups: null,

      countQuery: null,
      count: null,

      countHistoryCategory: null,
      countHistoryRange: null,
      countHistory: null
    },
    action: AnyAction
  ): MemberServiceState {
    switch (action.type) {
      case SET_DEPARTMENTS_ACTION_TYPE:
        return mergeObject(
          state,
          {
            departments: mergeArray(state.departments, action.departments)
          }
        );
      case SET_TYPES_OF_STUDY_ACTION_TYPE:
        return mergeObject(
          state,
          {
            typesOfStudy: mergeArray(state.typesOfStudy, action.typesOfStudy)
          }
        );
      case SET_STUDY_PROGRAMMES_ACTION_TYPE:
        return mergeObject(
          state,
          {
            studyProgrammes: mergeArray(state.studyProgrammes, action.studyProgrammes)
          }
        );
      case SET_YEARS_OF_STUDY_ACTION_TYPE:
        return mergeObject(
          state,
          {
            yearsOfStudy: mergeArray(state.yearsOfStudy, action.yearsOfStudy)
          }
        );
      case SET_AFFILIATED_STUDENT_INTEREST_GROUPS_ACTION_TYPE:
        return mergeObject(
          state,
          {
            affiliatedStudentInterestGroups: mergeArray(
              state.affiliatedStudentInterestGroups,
              action.affiliatedStudentInterestGroups
            )
          }
        );
      case SET_MEMBER_COUNT_ACTION_TYPE:
        return mergeObject(
          state,
          {
            countQuery: action.countQuery,
            count: action.count
          }
        );
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
