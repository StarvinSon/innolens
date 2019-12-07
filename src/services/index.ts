import { DependencyRegistrant } from '../app-context';

import { registerClientsService } from './client';
import { registerMembersService } from './members';
import { registerOAuth2Service } from './oauth2';
import { registerUsersService } from './users';


export const registerServices: DependencyRegistrant = (appCtx) => {
  registerClientsService(appCtx);
  registerMembersService(appCtx);
  registerOAuth2Service(appCtx);
  registerUsersService(appCtx);
};
