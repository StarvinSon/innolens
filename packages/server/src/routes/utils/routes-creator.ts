import KoaRouter from 'koa-router';

import { AppContext } from '../../app-context';
import { RouterMiddleware } from '../../middlewares';

import { Router } from './router';


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
