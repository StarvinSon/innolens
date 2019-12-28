import koaStatic from 'koa-static';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';
import { Middleware } from '../middlewares';


export interface StaticControllerOptions {
  readonly root: string;
}

export interface StaticController {
  /**
   * Expect subpath in ctx.params.subPath.
   * E.g. router.get(':subPath(.*)', staticController.getFile);
   */
  getFile: Middleware;
}

export const StaticController = createToken<StaticController>(module, 'StaticController');

// eslint-disable-next-line max-len
export const createStaticController: DependencyCreator<StaticController, [StaticControllerOptions]> = (appCtx, options) => {
  // Why is it so complicated?
  //
  // koa-router does not run middleware (mounted with the 'use' method)
  // when no route is matched (mounted with the 'get', 'post', etc. method).
  // In order for the middleware to run, at least one route in the router must be matched.
  // The possible path for this route can be '*', '(.*)', etc. which match everything.
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

  const staticMw: Middleware = koaStatic(options.root);

  const getFile: Middleware = async (ctx, next) => {
    const oriPath = ctx.path;
    const subPath = /^\/static(\/.*)$/.exec(ctx.params.subPath)?.[1] ?? '/';

    ctx.path = subPath; // modify ctx.path
    await staticMw(ctx, async () => {
      ctx.path = oriPath; // revert ctx.path
      await next();
      ctx.path = subPath; // modify ctx.path
    });
    ctx.path = oriPath; // revert ctx.path
  };

  return {
    getFile
  };
};

// eslint-disable-next-line max-len
export const registerStaticController = createSingletonDependencyRegistrant(StaticController, createStaticController);
