import { ToJson } from '../../conversion';


export interface RequestBody {
  readonly grant_type: 'refresh_token';
  readonly refresh_token: string;
  readonly scope: string;
}

export const requestBodySchema: object = {
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

export const fromRequestBodyJson =
  (json: ToJson<RequestBody>): RequestBody => json;

export const toRequestBodyJson =
  (req: RequestBody): ToJson<RequestBody> => req;


export interface ResponseBody {
  readonly access_token: string;
  readonly token_type: 'Bearer';
  readonly expires_in: number;
  readonly scope: string;
  readonly refresh_token?: string;
}

export const responseBodySchema: object = {
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

export const fromResponseBodyJson =
  (json: ToJson<ResponseBody>): ResponseBody => json;

export const toResponseBodyJson =
  (obj: ResponseBody): ToJson<ResponseBody> => obj;
