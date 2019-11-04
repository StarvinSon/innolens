import { Logger } from 'winston';
import Router from 'koa-router';

import { AppService } from '../services';
import { MembersService } from '../services/members';
import { fromAsync } from '../utils/array';

import { AppRouter } from './common';


export interface MembersRoutesOptions {
  readonly logger: Logger;
  readonly appService: AppService<MembersRoutesServiceMap>;
}

export interface MembersRoutesServiceMap {
  readonly members: MembersService;
}

export const createMembersRoutes = (options: MembersRoutesOptions) => {
  const { logger, appService } = options;

  const router: AppRouter = new Router();

  router.get('/', async (ctx) => {
    const records = await fromAsync(appService.members.findAll());
    logger.info(`Found ${records.length} records in the members collection`);
    ctx.body = records;
  });

  return [router.routes(), router.allowedMethods()];
};
