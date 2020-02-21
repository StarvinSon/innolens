import {
  decorate, Factory, singleton,
  name, injectableFactory
} from '@innolens/resolver';

import { Router, createRouter, nest } from '../router';

import { createMemberCompositionRouter } from './member-compositions';
import { createMembersRouter } from './members';
import { createOAuth2Router } from './oauth2';
import { createUsersRouter } from './users';


type RouterType =
  'memberCompositions'
  | 'members'
  | 'oauth2'
  | 'users';

type Routers = Readonly<Record<RouterType, Router>>;

const deps: Readonly<Record<RouterType, Factory<Router>>> = {
  memberCompositions: createMemberCompositionRouter,
  members: createMembersRouter,
  oauth2: createOAuth2Router,
  users: createUsersRouter
};

export const createApiRouter = decorate(
  name('createApiRouter'),
  injectableFactory(deps),
  singleton(),
  (routers: Routers): Router => {
    const router = createRouter();
    nest(router, '/member-compositions', routers.memberCompositions);
    nest(router, '/members', routers.members);
    nest(router, '/oauth2', routers.oauth2);
    nest(router, '/users', routers.users);
    return router;
  }
);
