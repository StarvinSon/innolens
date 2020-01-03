import { StaticController } from '../controllers/static';

import { createApiRoutes } from './api';
import { makeRoutesCreatorAsync } from './utils/routes-creator';
import { useRoutesAsync } from './utils/routes-user';


export const createRoutes = makeRoutesCreatorAsync(async (appCtx, router) => {
  const staticController = appCtx.resolve(StaticController);

  await useRoutesAsync(appCtx, router, [
    ['/api', createApiRoutes]
  ]);

  router.get(':subPath(.*)', staticController.getFile);
});
