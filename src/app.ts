import Koa from 'koa';
import { Logger } from 'winston';

import { createRoutes } from './routes';


export interface CreateAppOptions {
  readonly logger: Logger;
  readonly staticRoot: string;
}

export const createApp = (options: CreateAppOptions) => {
  const { logger } = options;

  const app = new Koa();

  const routes = createRoutes({
    logger,
    staticRoot: options.staticRoot
  });
  routes.forEach((mw) => app.use(mw));

  return app;
};
