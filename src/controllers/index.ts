import { DependencyRegistrant } from '../app-context';

import { registerMemberGroupsController } from './member-groups';
import { registerMembersController } from './members';
import { registerOAuth2Controller } from './oauth2';
import { registerStaticController } from './static';
import { registerUsersController } from './users';


export interface ControllersOptions {
  readonly staticRoot: string;
}

// eslint-disable-next-line max-len
export const registerControllers: DependencyRegistrant<[ControllersOptions]> = (appCtx, options) => {
  const registrants: ReadonlyArray<DependencyRegistrant> = [
    registerMemberGroupsController,
    registerMembersController,
    registerOAuth2Controller,
    (c) => registerStaticController(c, {
      root: options.staticRoot
    }),
    registerUsersController
  ];
  registrants.forEach((register) => {
    register(appCtx);
  });
};
