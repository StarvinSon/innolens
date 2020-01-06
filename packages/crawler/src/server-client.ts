import { URL, URLSearchParams } from 'url';
import { Readable } from 'stream';

import fetch, {
  RequestInfo, RequestInit, Request, Response
} from 'node-fetch';

import { ContextFunction, createToken } from './context';
import { CrawlerOptions } from './crawler-options';


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

export const ServerClient = createToken<ServerClient>(__filename, 'ServerClient');


interface ServerClientImplOptions {
  readonly serverHost: string;
  readonly clientId: string;
  readonly username: string;
  readonly password: string;
}

class ServerClientImpl implements ServerClient {
  public readonly serverHost: string;
  private readonly _serverHostUrl: URL;

  public readonly clientId: string;
  public readonly username: string;
  public readonly password: string;
  private _accessToken: string | null = null;

  public constructor(options: ServerClientImplOptions) {
    this.serverHost = options.serverHost;
    this._serverHostUrl = new URL(this.serverHost);
    this.clientId = options.clientId;
    this.username = options.username;
    this.password = options.password;
  }

  public createRequest(url: RequestInfo, init?: RequestInit): Request {
    let normalizedReq: Request;
    if (typeof url === 'string') {
      normalizedReq = new Request(this._replaceOrigin(url), init);
    } else if (url instanceof Request) {
      normalizedReq = new Request(this._replaceOrigin(url.url), new Request(url, init));
    } else {
      normalizedReq = new Request(this._replaceOrigin(url.href), init);
    }

    return normalizedReq;
  }

  private _replaceOrigin(url: string): string {
    const { _serverHostUrl: serverHostUrl } = this;

    const absoluteUrl = new URL(url, serverHostUrl);
    absoluteUrl.protocol = serverHostUrl.protocol;
    absoluteUrl.host = serverHostUrl.host;

    return absoluteUrl.href;
  }

  public async fetch(url: RequestInfo, init?: RequestInit): Promise<Response> {
    return fetch(this.createRequest(url, init));
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
          Authorization: `Basic ${toBase64(`${this.clientId}:`)}`
        },
        body: new URLSearchParams({
          grant_type: 'password',
          username: this.username,
          password: this.password,
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
      res = await fetch(req.clone());

      // Only retry if the server responds 401 and it has not try a new token yet.
      retry = res.status === 401 && !shouldRenewToken;
    } while (retry);

    // Free the request body
    if (req.body !== null && !(req.body as Readable).destroyed) {
      (req.body as Readable).destroy();
    }
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
}

export const registerServerClient: ContextFunction = (ctx) => {
  ctx.registerSingletonDependency(ServerClient, (c) => {
    const opts = c.resolve(CrawlerOptions);
    return new ServerClientImpl({
      serverHost: opts.serverHost,
      clientId: opts.clientId,
      username: opts.username,
      password: opts.password
    });
  });
};
