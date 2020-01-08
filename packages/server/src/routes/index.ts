import { StaticController } from '../controllers/static';
import { RouterMiddleware } from '../middlewares';
import { createToken, ResolverFunction } from '../resolver';

import { createApiRoutes } from './api';
import { makeRoutesCreatorAsync } from './utils/routes-creator';
import { useRoutesAsync } from './utils/routes-user';
import { bindController } from './utils/bind-controller';


export type Routes = ReadonlyArray<RouterMiddleware>;


export const createRoutes = makeRoutesCreatorAsync(async (resolver, router) => {
  const staticController = resolver.resolve(bindController(StaticController));

  await useRoutesAsync(resolver, router, [
    ['/api', createApiRoutes]
  ]);

  router.get(':subPath(.*)', staticController.get);
});


export const Routes = createToken<Promise<Routes>>(__filename, 'Routes');

export const registerRoutes: ResolverFunction = (resolver) =>
  resolver.registerSingleton(
    Routes,
    createRoutes
  );
