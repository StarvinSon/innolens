import { makeRoutesCreatorAsync, useRoutesAsync } from '../common';

import { createMembersRoutes } from './members';
import { createUsersRoutes } from './users';
import { createOAuth2Routes } from './oauth2';


export const createApiRoutes = makeRoutesCreatorAsync(async (appCtx, router) => {
  await useRoutesAsync(appCtx, router, [
    ['/users', createUsersRoutes],
    ['/oauth2', createOAuth2Routes],
    ['/members', createMembersRoutes]
  ]);
});
