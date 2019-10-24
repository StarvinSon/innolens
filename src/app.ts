import Koa from 'koa';
import { Logger } from 'winston';

import { createRoutes } from './routes';
import { createAppDbClient } from './db';


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

  const app = new Koa();

  const routes = createRoutes({
    logger,
    staticRoot,
    appDbClient
  });
  routes.forEach((mw) => app.use(mw));

  return app;
};
