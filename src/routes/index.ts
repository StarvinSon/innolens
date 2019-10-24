import Router from 'koa-router';
import { Logger } from 'winston';

import { AppDbClient } from '../db';

import { AppRouter } from './common';
import { createApiRoutes } from './api';
import { createStaticRoutes } from './static';


export interface RoutesOptions {
  readonly logger: Logger;
  readonly staticRoot: string;
  readonly appDbClient: AppDbClient;
}

export const createRoutes = (options: RoutesOptions) => {
  const { logger, staticRoot, appDbClient } = options;

  const router: AppRouter = new Router();

  const staticRoutes = createStaticRoutes({ logger, root: staticRoot });
  router.use('/static', ...staticRoutes);

  const apiRoutes = createApiRoutes({ logger, appDbClient });
  router.use('/api', ...apiRoutes);

  return [router.routes(), router.allowedMethods()];
};
