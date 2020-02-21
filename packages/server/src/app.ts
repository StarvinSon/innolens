import {
  createToken, decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import { INTERNAL_SERVER_ERROR, getStatusText } from 'http-status-codes';
import Koa, { Middleware as KoaMiddleware, DefaultContext, DefaultState } from 'koa';
import compress from 'koa-compress';

import { Logger } from './logger';
import { createAppRouter } from './routes';
import { Router } from './routes/router';


export interface App extends Koa<DefaultState, DefaultContext> {}

export const App = createToken<App>('App');


const isError = (val: unknown): val is Error & Readonly<Record<string, unknown>> =>
  val instanceof Error;

const errorHandler = (logger: Logger): KoaMiddleware<DefaultState, DefaultContext> =>
  async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      const statusCode: number =
        isError(err) && typeof err.statusCode === 'number'
          ? err.statusCode
          : isError(err) && typeof err.status === 'number'
            ? err.status
            : INTERNAL_SERVER_ERROR;
      const headers: Readonly<Record<string, string>> =
        isError(err) && typeof err.headers === 'object' && err.headers !== null
          ? err.headers as Readonly<Record<string, string>>
          : {};
      const code: string =
        statusCode < INTERNAL_SERVER_ERROR && isError(err) && typeof err.code === 'string'
          ? err.code
          : getStatusText(statusCode);
      const description: string | null =
        statusCode < INTERNAL_SERVER_ERROR && isError(err) && typeof err.message === 'string'
          ? err.message
          : null;

      ctx.status = statusCode;
      ctx.set(headers);
      ctx.body = {
        code,
        ...description === null ? null : { description }
      };

      if (statusCode >= INTERNAL_SERVER_ERROR) {
        logger.error('%O', err);
      }
    }
  };

export const createApp = decorate(
  name('createApp'),
  injectableFactory(createAppRouter, Logger),
  singleton(),
  (router: Router, logger: Logger): App => {
    const app: App = new Koa();
    app.use(compress());
    app.use(errorHandler(logger));
    app.use(router.allowedMethods()).use(router.routes());
    return app;
  }
);
