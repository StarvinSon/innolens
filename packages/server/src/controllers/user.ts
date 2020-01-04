import { NOT_IMPLEMENTED } from 'http-status-codes';

import { createToken, createSingletonDependencyRegistrant, DependencyCreator } from '../app-context';
import { Middleware } from '../middlewares';
import { UserService } from '../services/user';


export interface UserController {
  getByUsername: Middleware;
}

export const UserController = createToken<Promise<UserController>>(module, 'UserController');

export const createUserController: DependencyCreator<Promise<UserController>> = async (appCtx) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const userService = await appCtx.resolve(UserService);

  const getByUsername: Middleware = async (ctx) => {
    ctx.status = NOT_IMPLEMENTED;
  };

  return {
    getByUsername
  };
};

// eslint-disable-next-line max-len
export const registerUserController = createSingletonDependencyRegistrant(UserController, createUserController);
