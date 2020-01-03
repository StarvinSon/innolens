import { INTERNAL_SERVER_ERROR, getStatusText } from 'http-status-codes';
import Koa, { DefaultContext, DefaultState } from 'koa';
import compress from 'koa-compress';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from './app-context';
import { Logger } from './log';
import { createRoutes } from './routes';


export type App = Koa<DefaultState, DefaultContext>;

export const App = createToken<Promise<App>>(module, 'App');

export const createApp: DependencyCreator<Promise<App>> = async (appCtx) => {
  const logger = appCtx.resolve(Logger);

  const app: App = new Koa();

  app.use(compress());

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      const statusCode: number = err.statusCode ?? err.status ?? INTERNAL_SERVER_ERROR;
      const headers: { readonly [key: string]: string } = err.headers ?? {};
      const errorCode: string = err.errorCode ?? getStatusText(statusCode);
      const description: string | null = err.description ?? null;

      ctx.status = statusCode;
      ctx.set(headers);
      ctx.body = {
        errorCode,
        ...description === null ? null : { description }
      };

      if (statusCode >= INTERNAL_SERVER_ERROR) {
        logger.error(err);
      }
    }
  });

  const routes = await createRoutes(appCtx);
  routes.forEach((mw) => app.use(mw));

  return app;
};

export const registerApp = createSingletonDependencyRegistrant(App, createApp);
