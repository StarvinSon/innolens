import * as Api from '@innolens/api/node';
import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver';
import KoaRouter from '@koa/router';
import { DefaultState, DefaultContext } from 'koa';

import { MemberController } from '../controllers/member';
import { OAuth2Controller } from '../controllers/oauth2';
import { SpaceController } from '../controllers/space';
import { StaticController } from '../controllers/static';
import { bindMethods } from '../utils/method-binder';


const bindControllerMethods = <T extends Readonly<Record<string, object>>>(obj: T): T =>
  Object.fromEntries(Object.entries(obj)
    .map(([key, controller]) => [key, bindMethods(controller)]));


export interface Router extends KoaRouter<DefaultState, DefaultContext> {}

export const Router = decorate(
  name('createRoutes'),
  injectableFactory({
    member: MemberController,
    oauth2: OAuth2Controller,
    space: SpaceController,
    static: StaticController
  }),
  singleton(),
  (_controllers: {
    member: MemberController,
    oauth2: OAuth2Controller,
    space: SpaceController,
    static: StaticController
  }): Router => {
    const controllers = bindControllerMethods(_controllers);
    const router: Router = new KoaRouter();

    // member
    router.get(Api.Members.GetCountHistory.path, controllers.member.getCountHistory);
    router.post(Api.Members.PostMembers.path, controllers.member.postMembers);

    // oauth2
    router.post(Api.OAuth2.PostToken.path, controllers.oauth2.postToken);

    // space
    router.post(Api.Spaces.PostSpaces.path, controllers.space.postSpaces);
    router.get(Api.Spaces.GetSpaces.path, controllers.space.getSpaces);

    // fallback
    router.get(':subPath(.*)', controllers.static.get);

    return router;
  }
);
