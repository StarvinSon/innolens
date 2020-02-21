import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver';

import { StaticController } from '../controllers/static';
import { bindMethods } from '../utils/method-binder';

import { createApiRouter } from './api';
import { Router, createRouter, nest } from './router';


export const createAppRouter = decorate(
  name('createRoutes'),
  injectableFactory(createApiRouter, StaticController),
  singleton(),
  (apiRouter: Router, staticCtr: StaticController): Router => {
    const boundStaticCtr = bindMethods(staticCtr);

    const router = createRouter();
    nest(router, '/api', apiRouter);
    router.get(':subPath(.*)', boundStaticCtr.get);
    return router;
  }
);
