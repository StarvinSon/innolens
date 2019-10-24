import { Logger } from 'winston';
import Router from 'koa-router';

import { AppDbClient } from '../db';

import { AppRouter } from './common';


export interface MembersRoutesOptions {
  readonly logger: Logger;
  readonly appDbClient: AppDbClient;
}

export const createMembersRoutes = (options: MembersRoutesOptions) => {
  const { logger, appDbClient } = options;

  const router: AppRouter = new Router();

  router.get('/', async (ctx) => {
    const records = await appDbClient.db.members.find({}, { limit: 10 }).toArray();
    logger.info(`Found ${records.length} records in the members collection`);
    ctx.body = records;
  });

  return [router.routes(), router.allowedMethods()];
};
