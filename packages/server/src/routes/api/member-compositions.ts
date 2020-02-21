import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver';

import { MemberCompositionController } from '../../controllers/member-composition';
import { bindMethods } from '../../utils/method-binder';
import { Router, createRouter } from '../router';


export const createMemberCompositionRouter = decorate(
  name('createMemberCompositionRouter'),
  injectableFactory(MemberCompositionController),
  singleton(),
  (ctr: MemberCompositionController): Router => {
    const bctr = bindMethods(ctr);
    return createRouter()
      .get('/', bctr.get)
      .post('/', bctr.post);
  }
);
