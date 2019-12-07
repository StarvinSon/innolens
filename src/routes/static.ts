import { StaticController } from '../controllers/static';

import { makeRoutesCreator } from './common';


export const createStaticRoutes = makeRoutesCreator((appCtx, router) => {
  const staticController = appCtx.resolve(StaticController);

  router.get(':subPath(.*)', staticController.getFile);
});
