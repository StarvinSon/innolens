import { createToken, createSingletonDependencyRegistrant } from '../context';
import { mergeObject } from '../utils/immutable/object';

import { Action, Reducer, ActionsCreator } from './types';


export interface OAuth2State {
  readonly username: string;
  readonly password: string;
  readonly token: OAuth2Token | null;
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


const initialState: OAuth2State = {
  username: '',
  password: '',
  token: null
};

export const reduceOAuth2TokenState: Reducer<OAuth2State> = (state = initialState, action) => {
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
};


export interface OAuth2Actions {
  getPasswordCredentialsUIAdapter(): OAuth2PasswordCredentialsUIAdapter | null;
  setPasswordCredentialsUIAdapter(adapter: OAuth2PasswordCredentialsUIAdapter | null): void;
  setPasswordCredentials(credentials: OAuth2PasswordCredentials): void;
  removePasswordCredentials(): void;
  setToken(token: OAuth2Token): void;
  removeToken(): void;
  getToken(): Promise<OAuth2Token>;
  getAccessToken(): Promise<string>;
}

export const OAuth2Actions = createToken<OAuth2Actions>(module.id, 'OAuth2Actions');

export interface OAuth2PasswordCredentialsUIAdapter {
  // eslint-disable-next-line max-len
  openAndGetCredentials(savedCredentials: OAuth2PasswordCredentials): Promise<OAuth2PasswordCredentials>;
  showError(msg: string): void;
  close(): void;
}

export interface OAuth2PasswordCredentials {
  readonly username: string;
  readonly password: string;
}

// eslint-disable-next-line max-len
export const createOAuth2TokenActions: ActionsCreator<OAuth2Actions, OAuth2State> = (ctx, getState) => {
  const clientAuthHeader = {
    Authorization: `Basic ${btoa('default:')}`
  } as const;

  let passwordCredentialsUIAdapter: OAuth2PasswordCredentialsUIAdapter | null = null;

  const getPasswordCredentialsUIAdapter: OAuth2Actions['getPasswordCredentialsUIAdapter'] = () =>
    passwordCredentialsUIAdapter;

  const setPasswordCredentialsUIAdapter: OAuth2Actions['setPasswordCredentialsUIAdapter'] = (adapter) => {
    passwordCredentialsUIAdapter = adapter;
  };

  const setPasswordCredentials: OAuth2Actions['setPasswordCredentials'] = (credentials) => {
    ctx.dispatchAction({
      type: SET_OAUTH2_PASSWORD_CREDENTIALS_ACTION_TYPE,
      username: credentials.username,
      password: credentials.password
    });
  };

  const removePasswordCredentials: OAuth2Actions['removePasswordCredentials'] = () => {
    ctx.dispatchAction({
      type: REMOVE_OAUTH2_PASSWORD_CREDENTIALS_ACTION_TYPE
    });
  };

  const setToken: OAuth2Actions['setToken'] = (token) => {
    ctx.dispatchAction<SetOAuth2TokenAction>({
      type: SET_OAUTH2_TOKEN_ACTION_TYPE,
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      refreshToken: token.refreshToken
    });
  };

  const removeToken: OAuth2Actions['removeToken'] = () => {
    ctx.dispatchAction<RemoveOAuth2TokenAction>({
      type: REMOVE_OAUTH2_TOKEN_ACTION_TYPE
    });
  };

  const getToken: OAuth2Actions['getToken'] = async () => {
    let state = getState();
    if (state.token === null) {
      const uiAdapter = passwordCredentialsUIAdapter;
      if (uiAdapter === null) {
        throw new Error('No password UI Adapter is installed');
      }

      let resBody: {
        readonly access_token: string;
        readonly refresh_token: string;
        readonly expires_in: number;
      } | null = null;
      while (resBody === null) {
        // eslint-disable-next-line no-await-in-loop
        const credentials = await uiAdapter.openAndGetCredentials({
          username: state.username,
          password: state.password
        });
        setPasswordCredentials(credentials);

        try {
          // eslint-disable-next-line no-await-in-loop
          const res = await fetch('/api/oauth2/token', {
            method: 'POST',
            headers: clientAuthHeader,
            body: new URLSearchParams({
              grant_type: 'password',
              username: credentials.username,
              password: credentials.password,
              scope: '*'
            }),
            cache: 'no-store'
          });
          if (!res.ok) {
            // eslint-disable-next-line no-await-in-loop
            throw await res.json();
          }

          // eslint-disable-next-line no-await-in-loop
          resBody = await res.json();
        } catch (err) {
          uiAdapter.showError(JSON.stringify(err, undefined, 2));
        }
      }
      uiAdapter.close();

      setToken({
        accessToken: resBody.access_token,
        accessTokenExpiresAt: new Date(Date.now() + resBody.expires_in * 1000).toISOString(),
        refreshToken: resBody.refresh_token
      });
      state = getState();
    }

    return state.token!;
  };

  const getAccessToken: OAuth2Actions['getAccessToken'] = async () =>
    (await getToken()).accessToken;


  return {
    getPasswordCredentialsUIAdapter,
    setPasswordCredentialsUIAdapter,
    setPasswordCredentials,
    removePasswordCredentials,
    setToken,
    removeToken,
    getToken,
    getAccessToken
  };
};

// eslint-disable-next-line max-len
export const registerOAuth2Actions = createSingletonDependencyRegistrant(OAuth2Actions, createOAuth2TokenActions);
