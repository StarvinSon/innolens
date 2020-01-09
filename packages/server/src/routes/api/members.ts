import { MemberController } from '../../controllers/member';
import { makeRoutesCreatorAsync } from '../utils/routes-creator';
import { bindAsyncController } from '../utils/bind-controller';


export const createMembersRoutes = makeRoutesCreatorAsync(async (resolver, router) => {
  const memberController = await resolver.resolve(bindAsyncController(MemberController));

  router.get('/', memberController.get);
  router.post('/', memberController.post);
});
