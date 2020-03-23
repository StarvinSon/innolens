import * as Api from '@innolens/api';
import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver';

import { MemberController } from '../controllers/member';
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
    member: MemberController,
    static: StaticController
  }),
  singleton(),
  (apiRouter: Router, _controllers: {
    member: MemberController,
    static: StaticController
  }): Router => {
    const controllers = bindControllerMethods(_controllers);
    const router = createRouter();

    // member
    router.get(Api.Member.GetHistory.path, controllers.member.getHistory);
    router.post(Api.Member.PostImport.path, controllers.member.postImport);

    nest(router, '/api', apiRouter);
    router.get(':subPath(.*)', controllers.static.get);

    return router;
  }
);
