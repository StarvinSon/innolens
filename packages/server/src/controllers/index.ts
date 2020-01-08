import { ResolverFunction } from '../resolver';

import { registerMemberGroupController } from './member-group';
import { registerMemberController } from './member';
import { registerOAuth2Controller } from './oauth2';
import { registerStaticController } from './static';
import { registerUserController } from './user';
import { registerClientAuthenticator } from './utils/client-authenticator';
import { registerUserAuthenticator } from './utils/user-authenticator';


const registrants: ReadonlyArray<ResolverFunction> = [
  registerMemberGroupController,
  registerMemberController,
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
