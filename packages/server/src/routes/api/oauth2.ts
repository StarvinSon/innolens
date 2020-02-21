import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver';

import { OAuth2Controller } from '../../controllers/oauth2';
import { bindMethods } from '../../utils/method-binder';
import { createRouter, Router } from '../router';


export const createOAuth2Router = decorate(
  name('createOAuth2Router'),
  injectableFactory(OAuth2Controller),
  singleton(),
  (ctr: OAuth2Controller): Router => {
    const bctr = bindMethods(ctr);
    return createRouter()
      .use(bctr.handleError)
      .post('/token', bctr.postToken);
  }
);
