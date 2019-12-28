import { DependencyRegistrant } from '../app-context';

import { registerClientsService } from './client';
import { registerMemberGroupsService } from './member-groups';
import { registerMembersService } from './members';
import { registerOAuth2Service } from './oauth2';
import { registerUsersService } from './users';


export const registerServices: DependencyRegistrant = (appCtx) => {
  const registrants: ReadonlyArray<DependencyRegistrant> = [
    registerClientsService,
    registerMemberGroupsService,
    registerMembersService,
    registerOAuth2Service,
    registerUsersService
  ];
  registrants.forEach((register) => {
    register(appCtx);
  });
};
