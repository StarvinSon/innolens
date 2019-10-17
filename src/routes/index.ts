import Router from 'koa-router';
import { Logger } from 'winston';

import { AppRouter } from './common';
import { createApiRoutes } from './api';
import { createStaticRoutes } from './static';


export interface CreateRoutesOptions {
  readonly logger: Logger;
  readonly staticRoot: string;
}

export const createRoutes = (options: CreateRoutesOptions) => {
  const { logger } = options;

  const router: AppRouter = new Router();

  const staticRoutes = createStaticRoutes({ logger, root: options.staticRoot });
  router.use('/static', ...staticRoutes);

  const apiRoutes = createApiRoutes({ logger });
  router.use('/api', ...apiRoutes);

  return [router.routes(), router.allowedMethods()];
};
