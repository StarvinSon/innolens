import { DependencyRegistrant } from '../app-context';

import { registerClientService } from './client';
import { registerMemberGroupService } from './member-group';
import { registerMemberService } from './member';
import { registerOAuth2Service } from './oauth2';
import { registerUserService } from './user';


export const registerServices: DependencyRegistrant = (appCtx) => {
  const registrants: ReadonlyArray<DependencyRegistrant> = [
    registerClientService,
    registerMemberGroupService,
    registerMemberService,
    registerOAuth2Service,
    registerUserService
  ];
  registrants.forEach((register) => {
    register(appCtx);
  });
};
