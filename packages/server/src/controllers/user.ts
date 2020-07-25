import { singleton, injectableConstructor } from '@innolens/resolver/lib-node';
import { NOT_IMPLEMENTED } from 'http-status-codes';

import { UserService } from '../services/user';

import { Context } from './context';


@injectableConstructor({
  userService: UserService
})
@singleton()
export class UserController {
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
