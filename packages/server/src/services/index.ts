import { ResolverFunction } from '../resolver';

import { registerClientService } from './client';
import { registerMemberService } from './member';
import { registerMemberCompositionService } from './member-composition';
import { registerOAuth2Service } from './oauth2';
import { registerUserService } from './user';


const registrants: ReadonlyArray<ResolverFunction> = [
  registerClientService,
  registerMemberCompositionService,
  registerMemberService,
  registerOAuth2Service,
  registerUserService
];

export const registerServices: ResolverFunction = (resolver) => {
  for (const register of registrants) {
    register(resolver);
  }
};
