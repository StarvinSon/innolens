import { NOT_IMPLEMENTED } from 'http-status-codes';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';
import { Middleware } from '../middlewares';
import { UserService } from '../services/user';

import { Context } from './context';


export interface UserController {
  getByUsername: Middleware;
}


export class UserControllerImpl implements UserController {
  private readonly _userService: UserService;

  public constructor(options: {
    userService: UserService;
  }) {
    ({
      userService: this._userService
    } = options);
  }

  public async getByUsername(ctx: Context): Promise<void> {
    ctx.status = NOT_IMPLEMENTED;
  }
}


export const UserController = createToken<Promise<UserController>>(__filename, 'UserController');

export const registerUserController = createAsyncSingletonRegistrant(
  UserController,
  { userService: UserService },
  (opts) => new UserControllerImpl(opts)
);
