import Koa from 'koa';
import { Logger } from 'winston';

import { createRoutes } from './routes';
import { createAppDbClient } from './db';
import { createAppService } from './services';


export interface AppOptions {
  readonly logger: Logger;
  readonly staticRoot: string;
  readonly dbConnectionUri: string;
}

export const createApp = async (options: AppOptions) => {
  const { logger, staticRoot, dbConnectionUri } = options;

  const appDbClient = await createAppDbClient({
    logger,
    connectionUri: dbConnectionUri
  });

  const appService = createAppService({ logger, appDbClient });

  const app = new Koa();

  const routes = createRoutes({
    logger,
    staticRoot,
    appService
  });
  routes.forEach((mw) => app.use(mw));

  return app;
};
