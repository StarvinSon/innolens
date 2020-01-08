import KoaRouter from 'koa-router';

import { RouterMiddleware } from '../../middlewares';
import { Resolver, ResolverFunction } from '../../resolver';
import { Router } from '../router';


export type RoutesCreator<T extends ReadonlyArray<any> = []> =
  ResolverFunction<Array<RouterMiddleware>, T>;

export type RoutesCreatorAsync<T extends ReadonlyArray<any> = []> =
  ResolverFunction<Promise<Array<RouterMiddleware>>, T>;

export const makeRoutesCreator = <T extends ReadonlyArray<any> = []>(
  builder: (resolver: Resolver, router: Router, ...args: T) => void
): RoutesCreator<T> => {
  const createRoutes: RoutesCreator<T> = (resolver, ...args) => {
    const router: Router = new KoaRouter();
    builder(resolver, router, ...args);
    return [router.routes(), router.allowedMethods()];
  };
  return createRoutes;
};

export const makeRoutesCreatorAsync = <T extends ReadonlyArray<any> = []>(
  builder: (resolver: Resolver, router: Router, ...args: T) => void | Promise<void>
): RoutesCreatorAsync<T> => {
  const createRoutes: RoutesCreatorAsync<T> = async (resolver, ...args) => {
    const router: Router = new KoaRouter();
    await builder(resolver, router, ...args);
    return [router.routes(), router.allowedMethods()];
  };
  return createRoutes;
};
