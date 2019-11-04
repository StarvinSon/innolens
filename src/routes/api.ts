import Router from 'koa-router';
import { Logger } from 'winston';

import { AppService } from '../services';

import { AppRouter } from './common';
import { createMembersRoutes, MembersRoutesServiceMap } from './members';


export interface ApiRoutesOptions {
  readonly logger: Logger;
  readonly appService: AppService<ApiRoutesServiceMap>;
}

export type ApiRoutesServiceMap = MembersRoutesServiceMap;

export const createApiRoutes = (options: ApiRoutesOptions) => {
  const { logger, appService } = options;

  const router: AppRouter = new Router();

  const messagesRoutes = createMembersRoutes({ logger, appService });
  router.use('/members', ...messagesRoutes);

  return [router.routes(), router.allowedMethods()];
};
