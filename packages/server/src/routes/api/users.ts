import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver';

import { UserController } from '../../controllers/user';
import { bindMethods } from '../../utils/method-binder';
import { createRouter, Router } from '../router';


export const createUsersRouter = decorate(
  name('createUsersRouter'),
  injectableFactory(UserController),
  singleton(),
  (ctr: UserController): Router => {
    const bctr = bindMethods(ctr);
    return createRouter()
      .get('/:username', bctr.getByUsername);
  }
);
