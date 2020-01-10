import { ResolverFunction } from '../resolver';

import { registerMemberController } from './member';
import { registerMemberCompositionController } from './member-composition';
import { registerOAuth2Controller } from './oauth2';
import { registerStaticController } from './static';
import { registerUserController } from './user';
import { registerClientAuthenticator } from './utils/client-authenticator';
import { registerUserAuthenticator } from './utils/user-authenticator';


const registrants: ReadonlyArray<ResolverFunction> = [
  registerMemberController,
  registerMemberCompositionController,
  registerOAuth2Controller,
  registerStaticController,
  registerUserController,

  registerClientAuthenticator,
  registerUserAuthenticator
];

export const registerControllers: ResolverFunction = (resolver) => {
  for (const register of registrants) {
    register(resolver);
  }
};
