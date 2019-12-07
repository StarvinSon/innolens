import { MembersService } from '../services/members';
import { fromAsync } from '../utils/array';
import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';

import { Middleware } from './common';


export interface MembersController {
  get: Middleware;
}

export const MembersController = createToken<Promise<MembersController>>(module, 'MembersController');

// eslint-disable-next-line max-len
export const createMembersController: DependencyCreator<Promise<MembersController>> = async (appCtx) => {
  const membersService = await appCtx.resolve(MembersService);

  const get: Middleware = async (ctx) => {
    ctx.body = await fromAsync(membersService.find());
  };

  return {
    get
  };
};

// eslint-disable-next-line max-len
export const registerMembersController = createSingletonDependencyRegistrant(MembersController, createMembersController);
