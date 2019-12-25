import KoaRouter from 'koa-router';
import { DefaultState, DefaultContext } from 'koa';

import { AppContext } from '../app-context';
import { RouterMiddleware } from '../middlewares';


export type Router = KoaRouter<DefaultState, DefaultContext>;

export interface RoutesCreator<T extends ReadonlyArray<any> = []> {
  (appCtx: AppContext, ...args: T): Array<RouterMiddleware>;
}

export interface RoutesCreatorAsync<T extends ReadonlyArray<any> = []> {
  (appCtx: AppContext, ...args: T): Promise<Array<RouterMiddleware>>;
}


export const makeRoutesCreator = <T extends ReadonlyArray<any> = []>(
  builder: (appCtx: AppContext, router: Router, ...args: T) => void
): RoutesCreator<T> => {
  const createRoutes: RoutesCreator<T> = (appCtx, ...args) => {
    const router: Router = new KoaRouter();
    builder(appCtx, router, ...args);
    return [router.routes(), router.allowedMethods()];
  };
  return createRoutes;
};

export const makeRoutesCreatorAsync = <T extends ReadonlyArray<any> = []>(
  builder: (appCtx: AppContext, router: Router, ...args: T) => void | Promise<void>
): RoutesCreatorAsync<T> => {
  const createRoutes: RoutesCreatorAsync<T> = async (appCtx, ...args) => {
    const router: Router = new KoaRouter();
    await builder(appCtx, router, ...args);
    return [router.routes(), router.allowedMethods()];
  };
  return createRoutes;
};


export const useRoutes = (
  appCtx: AppContext,
  router: Router,
  creators: ReadonlyArray<readonly [string, RoutesCreator]>
): void => {
  for (const [path, creator] of creators) {
    router.use(path, ...creator(appCtx));
  }
};

export const useRoutesAsync = async (
  appCtx: AppContext,
  router: Router,
  // eslint-disable-next-line max-len
  creators: ReadonlyArray<readonly [string | ReadonlyArray<string> | RegExp, RoutesCreator | RoutesCreatorAsync]>
): Promise<void> => {
  await creators.reduce(async (prev, [path, creator]) => {
    const [rs] = await Promise.all([
      creator(appCtx),
      prev
    ]);
    router.use(path as any, ...rs);
  }, Promise.resolve());
};
