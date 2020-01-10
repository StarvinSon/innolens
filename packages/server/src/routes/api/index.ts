import { makeRoutesCreatorAsync } from '../utils/routes-creator';
import { useRoutesAsync } from '../utils/routes-user';

import { createMembersRoutes } from './members';
import { createMemberCompositionRoutes } from './member-compositions';
import { createOAuth2Routes } from './oauth2';
import { createUsersRoutes } from './users';


export const createApiRoutes = makeRoutesCreatorAsync(async (resolver, router) => {
  await useRoutesAsync(resolver, router, [
    ['/users', createUsersRoutes],
    ['/oauth2', createOAuth2Routes],
    ['/members', createMembersRoutes],
    ['/member-compositions', createMemberCompositionRoutes]
  ]);
});
