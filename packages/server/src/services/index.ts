import { ResolverFunction } from '../resolver';

import { registerClientService } from './client';
import { registerMemberGroupService } from './member-group';
import { registerMemberService } from './member';
import { registerOAuth2Service } from './oauth2';
import { registerUserService } from './user';


const registrants: ReadonlyArray<ResolverFunction> = [
  registerClientService,
  registerMemberGroupService,
  registerMemberService,
  registerOAuth2Service,
  registerUserService
];

export const registerServices: ResolverFunction = (resolver) => {
  for (const register of registrants) {
    register(resolver);
  }
};
