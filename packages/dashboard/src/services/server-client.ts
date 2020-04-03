import { injectableConstructor, singleton } from '@innolens/resolver/web';

import { OAuth2Service } from './oauth2';


export class FetchNotOkError extends Error {
  public constructor(
    public readonly response: Response
  ) {
    super(`Server responded with ${response.status} ${response.statusText}`);
  }
}


@injectableConstructor({
  oauth2Service: OAuth2Service
})
@singleton()
export class ServerClient {
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
    init?: RequestInit
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
    init?: RequestInit & { renewToken?: boolean }
  ): Promise<Request> {
    const urlObj = new URL(url, window.location.href);
    if (
      urlObj.protocol !== window.location.protocol
      || urlObj.host !== window.location.host
    ) {
      throw new Error(`${url} is not in the same origin`);
    }

    if (init?.renewToken) {
      this._oauth2Service.removeToken();
    }
    const token = await this._oauth2Service.requestAccessToken();
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return new Request(urlObj.href, { ...init, headers });
  }

  public async fetchOk(
    url: string,
    init?: RequestInit
  ): Promise<Response> {
    const res = await this.fetch(url, init);
    if (!res.ok) {
      throw new FetchNotOkError(res);
    }
    return res;
  }

  public async fetchJsonOk(
    url: string,
    init?: RequestInit
  ): Promise<any> {
    const res = await this.fetchOk(url, init);
    return res.json();
  }
}
