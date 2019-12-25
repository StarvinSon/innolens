import { StaticController } from '../controllers/static';

import { makeRoutesCreatorAsync, useRoutesAsync } from './common';
import { createApiRoutes } from './api';


export const createRoutes = makeRoutesCreatorAsync(async (appCtx, router) => {
  const staticController = appCtx.resolve(StaticController);

  await useRoutesAsync(appCtx, router, [
    ['/api', createApiRoutes]
  ]);

  router.get(':subPath(.*)', staticController.getFile);
});
