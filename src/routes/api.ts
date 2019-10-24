import Router from 'koa-router';
import { Logger } from 'winston';

import { AppDbClient } from '../db';

import { AppRouter } from './common';
import { createMembersRoutes } from './members';


export interface ApiRoutesOptions {
  readonly logger: Logger;
  readonly appDbClient: AppDbClient;
}

export const createApiRoutes = (options: ApiRoutesOptions) => {
  const { logger, appDbClient } = options;

  const router: AppRouter = new Router();

  const messagesRoutes = createMembersRoutes({ logger, appDbClient });
  router.use('/members', ...messagesRoutes);

  return [router.routes(), router.allowedMethods()];
};
