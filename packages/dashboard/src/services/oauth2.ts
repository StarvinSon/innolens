import * as Api from '@innolens/api-legacy/lib-web';
import {
  injectableConstructor, singleton,
  map
} from '@innolens/resolver/lib-web';

import { DashboardOptions } from '../dashboard-options';
import { mergeObject } from '../utils/immutable/object';

import { Action, AnyAction } from './state-types';
import { Store } from './store';


export interface OAuth2PasswordCredentialsUIAdapter {
  requestCredentials(
    request: OAuth2PasswordCredentialsRequest
  ): Promise<OAuth2PasswordCredentialsResponse>;
  close(): void;
}

export interface OAuth2PasswordCredentialsRequest {
  readonly username: string;
  readonly password: string;
  readonly errorMessage: string | null;
}

export type OAuth2PasswordCredentialsResponse = {
  readonly type: 'entered';
  readonly username: string;
  readonly password: string;
} | {
  readonly type: 'cancelled';
} | {
  readonly type: 'ignored';
};

export interface OAuth2PasswordCredentials {
  readonly username: string;
  readonly password: string;
}

export interface OAuth2Token {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: string; // ISO8601 format
  readonly refreshToken: string | null;
}


const SET_OAUTH2_PASSWORD_CREDENTIALS_ACTION_TYPE = 'oauth2/SET_PASSWORD_CREDENTIALS';
// eslint-disable-next-line max-len
interface SetOAuth2PasswordCredentialsAction extends Action<typeof SET_OAUTH2_PASSWORD_CREDENTIALS_ACTION_TYPE> {
  readonly username: string;
  readonly password: string;
}

const REMOVE_OAUTH2_PASSWORD_CREDENTIALS_ACTION_TYPE = 'oauth2/REMOVE_PASSWORD_CREDENTIALS';
// eslint-disable-next-line max-len
interface RemoveOAuth2PasswordCredentialsAction extends Action<typeof REMOVE_OAUTH2_PASSWORD_CREDENTIALS_ACTION_TYPE> {}

const SET_OAUTH2_TOKEN_ACTION_TYPE = 'oauth2/SET_TOKEN';
interface SetOAuth2TokenAction extends Action<typeof SET_OAUTH2_TOKEN_ACTION_TYPE> {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: string; // ISO8601 format
  readonly refreshToken: string | null;
}

const REMOVE_OAUTH2_TOKEN_ACTION_TYPE = 'oauth2/REMOVE_TOKEN';
interface RemoveOAuth2TokenAction extends Action<typeof REMOVE_OAUTH2_TOKEN_ACTION_TYPE> {}

declare global {
  namespace App {
    interface ActionMap {
      [SET_OAUTH2_PASSWORD_CREDENTIALS_ACTION_TYPE]: SetOAuth2PasswordCredentialsAction;
      [REMOVE_OAUTH2_PASSWORD_CREDENTIALS_ACTION_TYPE]: RemoveOAuth2PasswordCredentialsAction;
      [SET_OAUTH2_TOKEN_ACTION_TYPE]: SetOAuth2TokenAction;
      [REMOVE_OAUTH2_TOKEN_ACTION_TYPE]: RemoveOAuth2TokenAction;
    }
  }
}


interface OAuth2State {
  readonly username: string;
  readonly password: string;
  readonly token: OAuth2Token | null;
}

const KEY = 'oauth2';
const KEY_LOCAL_STORAGE = 'innolens/oauth2/token';

@injectableConstructor(Store, map(DashboardOptions, (opts) => opts.clientId))
@singleton()
export class OAuth2Service {
  private readonly _store: Store;
  private readonly _clientId: string;

  private _requestTokenPromise: Promise<OAuth2Token> | null = null;


  public passwordCredentialsUIAdapter: OAuth2PasswordCredentialsUIAdapter | null = null;


  public constructor(store: Store, clientId: string) {
    this._store = store;
    this._clientId = clientId;
    store.addReducer(KEY, this._reduce.bind(this));

    const savedTokenJson = globalThis.localStorage.getItem(KEY_LOCAL_STORAGE);
    if (savedTokenJson !== null) {
      let tokenObj: any;
      try {
        tokenObj = JSON.parse(savedTokenJson);
      } catch {
        globalThis.localStorage.removeItem(KEY_LOCAL_STORAGE);
        return;
      }
      if (
        typeof tokenObj === 'object'
        && typeof tokenObj.accessToken === 'string'
        && typeof tokenObj.accessTokenExpiresAt === 'string'
        && typeof tokenObj.refreshToken === 'string'
      ) {
        this.setToken({
          accessToken: tokenObj.accessToken,
          accessTokenExpiresAt: tokenObj.accessTokenExpiresAt,
          refreshToken: tokenObj.refreshToken
        });
      }
    }
  }

  private get _state(): OAuth2State {
    return this._store.getState(KEY);
  }


  public async withAccessToken(
    performFetch: (accessToken: string) => Promise<Response>
  ): Promise<Response> {
    /* eslint-disable no-await-in-loop */
    for (let retry = false; ; retry = true) {
      if (retry) {
        this.removeToken();
      }
      const token = await this.requestAccessToken();

      const res = await performFetch(token);
      if (res.status !== 401 || retry) {
        return res;
      }
    }
    /* eslint-enable no-await-in-loop */
  }


  public setPasswordCredentials(credentials: OAuth2PasswordCredentials): void {
    this._store.dispatch({
      type: SET_OAUTH2_PASSWORD_CREDENTIALS_ACTION_TYPE,
      username: credentials.username,
      password: credentials.password
    });
  }

  public removePasswordCredentials(): void {
    this._store.dispatch({
      type: REMOVE_OAUTH2_PASSWORD_CREDENTIALS_ACTION_TYPE
    });
  }

  public getToken(): OAuth2Token | null {
    return this._state.token;
  }

  public setToken(token: OAuth2Token): void {
    this._store.dispatch({
      type: SET_OAUTH2_TOKEN_ACTION_TYPE,
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      refreshToken: token.refreshToken
    });
    try {
      globalThis.localStorage.setItem(KEY_LOCAL_STORAGE, JSON.stringify(token));
    } catch (err) {
      console.error(err);
    }
  }

  public removeToken(): void {
    this._store.dispatch({
      type: REMOVE_OAUTH2_TOKEN_ACTION_TYPE
    });
  }

  public async requestToken(): Promise<OAuth2Token> {
    if (this._requestTokenPromise !== null) {
      return this._requestTokenPromise;
    }

    this._requestTokenPromise = Promise.resolve().then(() => this._requestTokenInternal());
    try {
      return await this._requestTokenPromise;
    } finally {
      this._requestTokenPromise = null;
    }
  }

  private async _requestTokenInternal(): Promise<OAuth2Token> {
    const state = this._state;
    if (state.token !== null) {
      return state.token;
    }

    const uiAdapter = this.passwordCredentialsUIAdapter;
    if (uiAdapter === null) {
      throw new Error('No password UI Adapter is installed');
    }

    let { username, password } = state;
    let errorMessage: string | null = null;

    let result: {
      readonly type: 'cancelled' | 'ignored';
    } | {
      readonly type: 'successful';
      readonly token: OAuth2Token;
    } | undefined;

    /* eslint-disable no-await-in-loop, no-continue */
    while (result === undefined) {
      const askResult: OAuth2PasswordCredentialsResponse = await uiAdapter.requestCredentials({
        username,
        password,
        errorMessage
      });
      switch (askResult.type) {
        case 'entered': {
          ({ username, password } = askResult);
          this.setPasswordCredentials({
            username,
            password
          });
          break;
        }
        default: {
          result = { type: askResult.type };
          continue;
        }
      }

      let res: Response;
      try {
        res = await window.fetch(Api.OAuth2.PostToken.path, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${this._clientId}:`)}`
          },
          body: new URLSearchParams(Api.OAuth2.PostToken.Password.toRequestBodyJson({
            grant_type: 'password',
            username: askResult.username,
            password: askResult.password,
            scope: '*'
          })),
          cache: 'no-store'
        });
      } catch (err) {
        console.error(err);
        errorMessage = String(err);
        continue;
      }

      if (!res.ok) {
        let resBody: any;
        try {
          resBody = await res.text();
        } catch (err) {
          console.error(err);
          resBody = 'Failed to get body';
        }
        errorMessage = String(resBody);
        continue;
      }

      let resBody: any;
      try {
        resBody = Api.OAuth2.PostToken.Password.fromResponseBodyJson(await res.json());
      } catch (err) {
        console.error(err);
        errorMessage = String(err);
        continue;
      }

      result = {
        type: 'successful',
        token: {
          accessToken: resBody.access_token,
          accessTokenExpiresAt: new Date(Date.now() + resBody.expires_in * 1000).toISOString(),
          refreshToken: resBody.refresh_token
        }
      };
    }
    /* eslint-enable no-await-in-loop, no-continue */

    uiAdapter.close();

    switch (result.type) {
      case 'successful': {
        this.setToken(result.token);
        return result.token;
      }
      case 'cancelled': {
        throw new Error('User cancelled opereation');
      }
      case 'ignored': {
        throw new Error('User ignored operation');
      }
      default: {
        throw new Error('Unknown result');
      }
    }
  }

  public async requestAccessToken(): Promise<string> {
    return (await this.requestToken()).accessToken;
  }

  private _reduce(
    state: OAuth2State = {
      username: '',
      password: '',
      token: null
    },
    action: AnyAction
  ): OAuth2State {
    switch (action.type) {
      case SET_OAUTH2_PASSWORD_CREDENTIALS_ACTION_TYPE: {
        return mergeObject(state, {
          username: action.username,
          password: action.password
        });
      }
      case REMOVE_OAUTH2_PASSWORD_CREDENTIALS_ACTION_TYPE: {
        return mergeObject(state, {
          username: '',
          password: ''
        });
      }
      case SET_OAUTH2_TOKEN_ACTION_TYPE: {
        return mergeObject(state, {
          token: mergeObject(state.token, {
            accessToken: action.accessToken,
            accessTokenExpiresAt: action.accessTokenExpiresAt,
            refreshToken: action.refreshToken
          })
        });
      }
      case REMOVE_OAUTH2_TOKEN_ACTION_TYPE: {
        return mergeObject(state, {
          token: null
        });
      }
      default: {
        return state;
      }
    }
  }
}
