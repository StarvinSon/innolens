import { ToJson } from '../conversion';


export const path = '/api/oauth2/token';


export interface BaseRequest {
  readonly grant_type: string;
}

export type BaseRequestJson = ToJson<BaseRequest>;

export const baseRequestJsonSchema: object = {
  type: 'object',
  required: ['grant_type'],
  properties: {
    grant_type: {
      type: 'string'
    }
  }
};

export const fromBaseRequestJson = (json: BaseRequestJson): BaseRequest => json;


export interface PasswordGrantRequest {
  readonly grant_type: 'password';
  readonly username: string;
  readonly password: string;
  readonly scope: string;
}

export type PasswordGrantRequestJson = ToJson<PasswordGrantRequest>;

export const passwordGrantRequestJsonSchema: object = {
  type: 'object',
  required: ['grant_type', 'username', 'password', 'scope'],
  additionalProperties: false,
  properties: {
    grant_type: {
      const: 'password'
    },
    username: {
      type: 'string'
    },
    password: {
      type: 'string'
    },
    scope: {
      type: 'string'
    }
  }
};

export const fromPasswordGrantRequestJson =
  (json: PasswordGrantRequestJson): PasswordGrantRequest => json;

export const toPasswordGrantRequestJson =
  (req: PasswordGrantRequest): PasswordGrantRequestJson => req;


export interface RefreshGrantRequest {
  readonly grant_type: 'refresh_token';
  readonly refresh_token: string;
  readonly scope: string;
}

export type RefreshGrantRequestJson = ToJson<RefreshGrantRequest>;

export const refreshGrantRequestJsonSchema: object = {
  type: 'object',
  required: ['grant_type', 'refresh_token', 'scope'],
  additionalProperties: false,
  properties: {
    grant_type: {
      const: 'refresh_token'
    },
    refresh_token: {
      type: 'string'
    },
    scope: {
      type: 'string'
    }
  }
};

export const fromRefreshGrantRequestJson =
  (json: RefreshGrantRequestJson): RefreshGrantRequest => json;

export const toRefreshGrantRequestJson =
  (req: RefreshGrantRequest): RefreshGrantRequestJson => req;


export interface PasswordGrantResponse {
  readonly access_token: string;
  readonly token_type: 'Bearer';
  readonly expires_in: number;
  readonly scope: string;
  readonly refresh_token?: string;
}

export type PasswordGrantResponseJson = ToJson<PasswordGrantResponse>;

export const passwordGrantResponseJsonSchema: object = {
  type: 'object',
  additionalProperties: false,
  required: [
    'access_token',
    'token_type',
    'expires_in',
    'scope'
  ],
  properties: {
    access_token: {
      type: 'string'
    },
    token_type: {
      const: 'Bearer'
    },
    expires_in: {
      type: 'integer'
    },
    scope: {
      type: 'string'
    },
    refresh_token: {
      type: 'string'
    }
  }
};

export const fromPasswordGrantResponseJson =
  (json: PasswordGrantResponseJson): PasswordGrantResponse => json;

export const toPasswordGrantResponseJson =
  (res: PasswordGrantResponse): PasswordGrantResponseJson => res;


export type RefreshGrantResponse = PasswordGrantResponse;

export type RefreshGrantResponseJson = ToJson<RefreshGrantResponse>;

export const refreshGrantResponseJsonSchema = passwordGrantResponseJsonSchema;

export const fromRefreshGrantResponseJson =
  (json: RefreshGrantResponseJson): RefreshGrantResponse => json;

export const toRefreshGrantResponseJson =
  (res: RefreshGrantResponse): RefreshGrantResponseJson => res;
