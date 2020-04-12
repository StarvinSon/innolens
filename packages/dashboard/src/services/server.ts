import { injectableConstructor, singleton } from '@innolens/resolver/web';

import { OAuth2Service } from './oauth2';


export class FetchNotOkError extends Error {
  public constructor(
    public readonly response: Response
  ) {
    super(`Server responded with ${response.status} ${response.statusText}`);
  }
}


export class JsonBody {
  public readonly json: object;

  public constructor(json: object) {
    this.json = json;
  }

  public strinify(): string {
    return JSON.stringify(this.json);
  }
}

export interface FetchInit extends Omit<RequestInit, 'body'> {
  body?: RequestInit['body'] | JsonBody;
}

@injectableConstructor({
  oauth2Service: OAuth2Service
})
@singleton()
export class ServerService {
  private readonly _oauth2Service: OAuth2Service;

  public constructor(options: {
    readonly oauth2Service: OAuth2Service;
  }) {
    ({
      oauth2Service: this._oauth2Service
    } = options);
  }

  public async fetch(
    url: string,
    init?: FetchInit
  ): Promise<Response> {
    /* eslint-disable no-await-in-loop */
    for (let retry = false; ; retry = true) {
      const req = await this._createRequest(url, {
        ...init,
        renewToken: retry
      });

      const res = await window.fetch(req);

      if (res.status !== 401 || retry) {
        return res;
      }
    }
    /* eslint-enable no-await-in-loop */
  }

  private async _createRequest(
    url: string,
    init?: FetchInit & { renewToken?: boolean }
  ): Promise<Request> {
    const urlObj = new URL(url, globalThis.location.href);
    if (
      urlObj.protocol !== globalThis.location.protocol
      || urlObj.host !== globalThis.location.host
    ) {
      throw new Error(`${url} is not in the same origin`);
    }

    const { renewToken = false, ...fetchInit } = init ?? {};

    let reqInit: RequestInit;
    if (fetchInit.body instanceof JsonBody) {
      reqInit = {
        ...fetchInit,
        body: fetchInit.body.strinify()
      };
      reqInit.headers = new Headers(fetchInit.headers);
      if (!reqInit.headers.has('Content-Type')) {
        reqInit.headers.set('Content-Type', 'application/json');
      }
    } else {
      reqInit = {
        ...fetchInit,
        body: fetchInit?.body
      };
    }

    if (renewToken) {
      this._oauth2Service.removeToken();
    }
    const token = await this._oauth2Service.requestAccessToken();
    reqInit.headers = new Headers(reqInit.headers);
    reqInit.headers.set('Authorization', `Bearer ${token}`);
    return new Request(urlObj.href, reqInit);
  }

  public async fetchOk(
    url: string,
    init?: FetchInit
  ): Promise<Response> {
    const res = await this.fetch(url, init);
    if (!res.ok) {
      throw new FetchNotOkError(res);
    }
    return res;
  }

  public async fetchJsonOk(
    url: string,
    init?: FetchInit
  ): Promise<any> {
    const res = await this.fetchOk(url, init);
    return res.json();
  }
}
