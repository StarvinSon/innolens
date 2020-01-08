import { INTERNAL_SERVER_ERROR, getStatusText } from 'http-status-codes';
import Koa, { DefaultContext, DefaultState } from 'koa';
import compress from 'koa-compress';

import { createToken, createAsyncSingletonRegistrant } from './resolver';
import { Logger } from './logger';
import { Routes } from './routes';


export interface App extends Koa<DefaultState, DefaultContext> {}


const isError = (val: unknown): val is Error & Readonly<Record<string, unknown>> =>
  val instanceof Error;

export const createApp = async (options: {
  logger: Logger;
  routes: Routes;
}): Promise<App> => {
  const { logger, routes } = options;

  const app: App = new Koa();

  app.use(compress());

  app.use(async (ctx, next) => {
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
        isError(err)
          ? err.message
          : null;

      ctx.status = statusCode;
      ctx.set(headers);
      ctx.body = {
        code,
        ...description === null ? null : { description }
      };

      if (statusCode >= INTERNAL_SERVER_ERROR) {
        logger.error(err);
      }
    }
  });

  routes.forEach((mw) => app.use(mw));

  return app;
};


export const App = createToken<Promise<App>>(__filename, 'App');

export const registerApp = createAsyncSingletonRegistrant(
  App,
  {
    logger: Logger,
    routes: Routes
  },
  createApp
);
