import { URL, URLSearchParams } from 'url';

import nodeFetch, {
  RequestInfo, RequestInit, Request, Response
} from 'node-fetch';

import { createToken, createSingletonRegistrant, depend } from './resolver';
import { AnalyzerOptions } from './analyzer-options';
import { Logger } from './logger';


const toBase64 = (text: string): string =>
  Buffer.from(text).toString('base64');


export class FetchNotOkError extends Error {
  public readonly code = 'ERR_FETCH_NOT_OK';
  public readonly response: Response;

  public constructor(response: Response) {
    super('Fetch not ok');
    this.response = response;
  }
}


export interface ServerClient {
  createRequest(url: RequestInfo, init?: RequestInit): Request;
  fetch(url: RequestInfo, init?: RequestInit): Promise<Response>;
  fetchOk(url: RequestInfo, init?: RequestInit): Promise<Response>;

  createAuthenticatedRequest(
    url: RequestInfo,
    init?: RequestInit,
    renewAccessToken?: boolean
  ): Promise<Request>;
  authenticatedFetch(
    url: RequestInfo,
    init?: RequestInit,
    renewAccessToken?: boolean
  ): Promise<Response>;
  authenticatedFetchOk(
    url: RequestInfo,
    init?: RequestInit,
    renewAccessToken?: boolean
  ): Promise<Response>;
}


interface ServerClientImplOptions {
  readonly logger: Logger;
  readonly serverHost: string;
  readonly clientId: string;
  readonly username: string;
  readonly password: string;
}

class ServerClientImpl implements ServerClient {
  private readonly _logger: Logger;

  private readonly _serverHost: string;
  private readonly _serverHostUrl: URL;
  private readonly _clientId: string;
  private readonly _username: string;
  private readonly _password: string;
  private _accessToken: string | null = null;

  public constructor(options: ServerClientImplOptions) {
    ({
      logger: this._logger,
      serverHost: this._serverHost,
      clientId: this._clientId,
      username: this._username,
      password: this._password
    } = options);
    this._serverHostUrl = new URL(this._serverHost);
  }

  public createRequest(url: RequestInfo, init?: RequestInit): Request {
    let normalizedReq: Request;
    if (typeof url === 'string') {
      normalizedReq = new Request(this._replaceOrigin(url), init);
    } else if (url instanceof Request) {
      const combinedReq = init === undefined ? url : new Request(url, init);
      normalizedReq = this._isSameOrigin(combinedReq.url)
        ? combinedReq
        : new Request(this._replaceOrigin(combinedReq.url), combinedReq);
    } else {
      normalizedReq = new Request(this._replaceOrigin(url.href), init);
    }

    return normalizedReq;
  }

  private _isSameOrigin(url: string): boolean {
    const { _serverHostUrl: serverHostUrl } = this;

    const absoluteUrl = new URL(url, serverHostUrl);
    return (
      serverHostUrl.protocol === absoluteUrl.protocol
      && serverHostUrl.host === absoluteUrl.host
    );
  }

  private _replaceOrigin(url: string): string {
    const { _serverHostUrl: serverHostUrl } = this;

    const absoluteUrl = new URL(url, serverHostUrl);
    absoluteUrl.protocol = serverHostUrl.protocol;
    absoluteUrl.host = serverHostUrl.host;

    return absoluteUrl.href;
  }

  public async fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
    return this._performFetch(this.createRequest(url, init));
  }

  public async fetchOk(url: RequestInfo, init?: RequestInit): Promise<Response> {
    const res = await this.fetch(url, init);
    if (!res.ok) {
      throw new FetchNotOkError(res);
    }
    return res;
  }

  public async createAuthenticatedRequest(
    url: RequestInfo,
    init?: RequestInit,
    renewAccessToken = false
  ): Promise<Request> {
    const token = await this._getAccessToken(renewAccessToken);
    const req = this.createRequest(url, init);
    req.headers.set('Authorization', `Bearer ${token}`);
    return req;
  }

  private async _getAccessToken(renew = false): Promise<string> {
    if (renew || this._accessToken === null) {
      const res = await this.fetchOk('/api/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${toBase64(`${this._clientId}:`)}`
        },
        body: new URLSearchParams({
          grant_type: 'password',
          username: this._username,
          password: this._password,
          scope: '*'
        })
      });

      const resJson = await res.json();
      this._accessToken = resJson.access_token as string;
    }
    return this._accessToken;
  }

  public async authenticatedFetch(
    url: RequestInfo,
    init?: RequestInit,
    renewAccessToken = false
  ): Promise<Response> {
    let req: Request | null = null;
    let res: Response;
    let retry = false;
    do {
      // Renew the token if the caller request it or it is a retry attempt.
      const shouldRenewToken: boolean = retry || renewAccessToken;

      // eslint-disable-next-line no-await-in-loop
      req = await (req === null
        ? this.createAuthenticatedRequest(url, init, shouldRenewToken)
        : this.createAuthenticatedRequest(req, undefined, shouldRenewToken));

      // Clone the request so that it can be retry.
      // eslint-disable-next-line no-await-in-loop
      res = await this._performFetch(req.clone());

      // Only retry if the server responds 401 and it has not try a new token yet.
      retry = res.status === 401 && !shouldRenewToken;
    } while (retry);

    return res;
  }

  public async authenticatedFetchOk(
    url: RequestInfo,
    init?: RequestInit,
    renewAccessToken = false
  ): Promise<Response> {
    const res = await this.authenticatedFetch(url, init, renewAccessToken);
    if (!res.ok) {
      throw new FetchNotOkError(res);
    }
    return res;
  }

  private async _performFetch(req: Request): Promise<Response> {
    const fetchPromises = nodeFetch(req.clone())
      .then<[Response, Response]>((res) => [res, res.clone()]);
    this._logReq(req, fetchPromises.then(([res]) => res));
    return fetchPromises.then(([, res]) => res);
  }

  private _logReq(req: Request, resPromise: Promise<Response>): void {
    Promise.all([
      (async (): Promise<[boolean, any]> => {
        let body: any;
        let failed = false;
        try {
          body = await req.text();
        } catch (err) {
          body = err;
          failed = true;
        }
        return [failed, {
          method: req.method,
          url: req.url,
          body
        }];
      })(),
      (async (): Promise<[boolean, any]> => {
        let info: any;
        let failed = false;
        try {
          const res = await resPromise;
          failed = failed || !res.ok;

          let body: any;
          try {
            body = await res.text();
          } catch (err) {
            body = err;
            failed = true;
          }
          info = {
            status: res.status,
            statusText: res.statusText,
            body
          };
        } catch (err) {
          info = err;
          failed = true;
        }
        return [failed, info];
      })()
    ])
      .then(([[reqFailed, reqInfo], [resFailed, resInfo]]) => {
        const level = reqFailed || resFailed ? 'error' : 'info';
        this._logger[level]('Fetch\n%O', { request: reqInfo, response: resInfo });
      });
  }
}


export const ServerClient = createToken<ServerClient>(__filename, 'ServerClient');

export const registerServerClient = createSingletonRegistrant(
  ServerClient,
  depend(
    {
      logger: Logger,
      analyzerOptions: AnalyzerOptions
    },
    ({ logger, analyzerOptions }) => new ServerClientImpl({
      logger,
      serverHost: analyzerOptions.serverHost,
      clientId: analyzerOptions.clientId,
      username: analyzerOptions.username,
      password: analyzerOptions.password
    })
  )
);
