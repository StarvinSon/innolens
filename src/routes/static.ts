import koaStatic from 'koa-static';
import { Logger } from 'winston';
import Router from 'koa-router';

import { AppRouter, AppMiddleware, AppRouterMiddleware } from './common';


export interface StaticRoutesOptions {
  readonly logger: Logger;
  readonly root: string;
}

export const createStaticRoutes = (options: StaticRoutesOptions): Array<AppRouterMiddleware> => {
  const { root } = options;

  const router: AppRouter = new Router();

  // Why is it so complicated?
  //
  // koa-router does not run middleware (mounted with the 'use' method)
  // when no route is matched (mounted with the 'get', 'post', etc. method).
  // In order for the middleware to run, at least one route in the router must be matched.
  // The possible path for this route can be '*', '(/.*)', etc. which match everything.
  // Reference: https://github.com/ZijianHe/koa-router/issues/257.
  //
  // Another problem is that koaStatic middleware use the path (root + ctx.path) to
  // locate the file to serve.
  // For example, when a request to /static/some/path.html is received, ctx.path is
  // set to /static/some/path.html, so koaStatic try to locate a file at
  // root/static/some/path.html which is wrong because the file is actually located at
  // root/some/path.html.
  // To solve this problem, we borrowed the idea from koa-mount which modifies ctx.path
  // when invoking koaStatic and reverts it back after invoking.
  // Reference: https://github.com/koajs/mount/blob/master/index.js#L48.

  const staticMw: AppMiddleware = koaStatic(root);

  // '(/.*)' matches every /static request using the GET method
  router.get('(/.*)', async (ctx, next) => {
    const oriPath = ctx.path;
    const subPath: string = ctx.params[0];

    ctx.path = subPath; // modify ctx.path
    await staticMw(ctx, async () => {
      ctx.path = oriPath; // revert ctx.path
      await next();
      ctx.path = subPath; // modify ctx.path
    });
    ctx.path = oriPath; // revert ctx.path
  });

  return [router.routes(), router.allowedMethods()];
};
