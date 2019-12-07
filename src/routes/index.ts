import { makeRoutesCreatorAsync, useRoutesAsync } from './common';
import { createApiRoutes } from './api';
import { createStaticRoutes } from './static';


export const createRoutes = makeRoutesCreatorAsync(async (appCtx, router) => {
  await useRoutesAsync(appCtx, router, [
    ['/static', createStaticRoutes],
    ['/api', createApiRoutes]
  ]);
});
