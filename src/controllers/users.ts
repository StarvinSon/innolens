import { NOT_IMPLEMENTED } from 'http-status-codes';

import { UsersService } from '../services/users';
import { createToken, createSingletonDependencyRegistrant, DependencyCreator } from '../app-context';
import { Middleware } from '../middlewares';


export interface UsersController {
  getByUsername: Middleware;
}

export const UsersController = createToken<Promise<UsersController>>(module, 'UsersController');

// eslint-disable-next-line max-len
export const createUsersController: DependencyCreator<Promise<UsersController>> = async (appCtx) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const usersService = await appCtx.resolve(UsersService);

  const getByUsername: Middleware = async (ctx) => {
    ctx.status = NOT_IMPLEMENTED;
  };

  return {
    getByUsername
  };
};

// eslint-disable-next-line max-len
export const registerUsersController = createSingletonDependencyRegistrant(UsersController, createUsersController);
