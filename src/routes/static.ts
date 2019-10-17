import koaStatic from 'koa-static';
import { Logger } from 'winston';

import { AppMiddleware } from './common';


export interface CreateStaticRoutesOptions {
  readonly logger: Logger;
  readonly root: string;
}

export const createStaticRoutes = (options: CreateStaticRoutesOptions) => {
  const { root } = options;

  const mw: AppMiddleware = koaStatic(root);

  return [mw];
};
