import { DependencyRegistrant } from '../app-context';

import { registerOAuth2Controller } from './oauth2';
import { registerMembersController } from './members';
import { registerUsersController } from './users';
import { registerStaticController } from './static';


export interface ControllersOptions {
  readonly staticRoot: string;
}

// eslint-disable-next-line max-len
export const registerControllers: DependencyRegistrant<[ControllersOptions]> = (appCtx, options) => {
  registerMembersController(appCtx);
  registerOAuth2Controller(appCtx);
  registerStaticController(appCtx, {
    root: options.staticRoot
  });
  registerUsersController(appCtx);
};
