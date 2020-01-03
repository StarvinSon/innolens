import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';
import { Middleware } from '../middlewares';
import { MembersService } from '../services/members';
import { fromAsync } from '../utils/array';

import { createUserAuthenticator } from './utils/user-authenticator';


export interface MembersController {
  get: Middleware;
}

export const MembersController = createToken<Promise<MembersController>>(module, 'MembersController');

// eslint-disable-next-line max-len
export const createMembersController: DependencyCreator<Promise<MembersController>> = async (appCtx) => {
  const [
    membersService,
    authenticateUser
  ] = await appCtx.resolveAllAsync(
    MembersService,
    createUserAuthenticator
  );

  const get: Middleware = async (ctx) => {
    await authenticateUser(ctx);
    ctx.body = await fromAsync(membersService.find());
  };

  return {
    get
  };
};

// eslint-disable-next-line max-len
export const registerMembersController = createSingletonDependencyRegistrant(MembersController, createMembersController);
