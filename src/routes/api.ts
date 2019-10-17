import Router from 'koa-router';
import { Logger } from 'winston';

import { AppRouter } from './common';


export interface CreateApiRoutesOptions {
  readonly logger: Logger;
}

export const createApiRoutes = (options: CreateApiRoutesOptions) => {
  const { logger } = options;

  const router: AppRouter = new Router();

  router.get('/', async (ctx) => {
    logger.info(`Responsing to ${ctx.path}`);
    ctx.body = 'InnoLens Api';
  });

  return [router.routes(), router.allowedMethods()];
};
