import * as Api from '@innolens/api/node';
import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver';

import { MembersController } from '../controllers/members';
import { StaticController } from '../controllers/static';
import { bindMethods } from '../utils/method-binder';

import { createApiRouter } from './api';
import { Router, createRouter, nest } from './router';


const bindControllerMethods = <T extends Readonly<Record<string, object>>>(obj: T): T =>
  Object.fromEntries(Object.entries(obj)
    .map(([key, controller]) => [key, bindMethods(controller)]));

export const createAppRouter = decorate(
  name('createRoutes'),
  injectableFactory(createApiRouter, {
    members: MembersController,
    static: StaticController
  }),
  singleton(),
  (apiRouter: Router, _controllers: {
    members: MembersController,
    static: StaticController
  }): Router => {
    const controllers = bindControllerMethods(_controllers);
    const router = createRouter();

    // member
    router.get(Api.Members.GetCountHistory.path, controllers.members.getCountHistory);
    router.post(Api.Members.PostImport.path, controllers.members.postImport);

    nest(router, '/api', apiRouter);
    router.get(':subPath(.*)', controllers.static.get);

    return router;
  }
);
