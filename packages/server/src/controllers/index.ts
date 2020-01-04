import { DependencyRegistrant } from '../app-context';

import { registerMemberGroupController } from './member-group';
import { registerMemberController } from './member';
import { registerOAuth2Controller } from './oauth2';
import { registerStaticController } from './static';
import { registerUserController } from './user';


export interface ControllersOptions {
  readonly staticRoot: string;
}

// eslint-disable-next-line max-len
export const registerControllers: DependencyRegistrant<[ControllersOptions]> = (appCtx, options) => {
  const registrants: ReadonlyArray<DependencyRegistrant> = [
    registerMemberGroupController,
    registerMemberController,
    registerOAuth2Controller,
    (c) => registerStaticController(c, {
      root: options.staticRoot
    }),
    registerUserController
  ];
  registrants.forEach((register) => {
    register(appCtx);
  });
};
