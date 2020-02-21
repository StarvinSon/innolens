import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver';

import { MemberController } from '../../controllers/member';
import { bindMethods } from '../../utils/method-binder';
import { Router, createRouter } from '../router';


export const createMembersRouter = decorate(
  name('createMembersRouter'),
  injectableFactory(MemberController),
  singleton(),
  (ctr: MemberController): Router => {
    const bctr = bindMethods(ctr);
    return createRouter()
      .get('/', bctr.get)
      .post('/', bctr.post);
  }
);
