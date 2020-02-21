import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import { NOT_IMPLEMENTED } from 'http-status-codes';

import { UserService } from '../services/user';

import { Context } from './context';
import { Middleware } from './middleware';


export interface UserController {
  getByUsername: Middleware;
}

export const UserController = createToken<UserController>('UserController');


@injectableConstructor({
  userService: UserService
})
@singleton()
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
