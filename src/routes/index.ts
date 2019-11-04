import Router from 'koa-router';
import { Logger } from 'winston';

import { AppService } from '../services';

import { AppRouter } from './common';
import { createApiRoutes, ApiRoutesServiceMap } from './api';
import { createStaticRoutes } from './static';


export interface RoutesOptions {
  readonly logger: Logger;
  readonly staticRoot: string;
  readonly appService: AppService<ApiRoutesServiceMap>;
}

export const createRoutes = (options: RoutesOptions) => {
  const { logger, staticRoot, appService } = options;

  const router: AppRouter = new Router();

  const staticRoutes = createStaticRoutes({ logger, root: staticRoot });
  router.use('/static', ...staticRoutes);

  const apiRoutes = createApiRoutes({ logger, appService });
  router.use('/api', ...apiRoutes);

  return [router.routes(), router.allowedMethods()];
};
