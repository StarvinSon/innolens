import { MemberGroupController } from '../../controllers/member-group';
import { makeRoutesCreatorAsync } from '../utils/routes-creator';
import { bindAsyncController } from '../utils/bind-controller';


export const createMemberGroupsRoutes = makeRoutesCreatorAsync(async (resolver, router) => {
  const memberGroupController = await resolver.resolve(bindAsyncController(MemberGroupController));

  router.get('/', memberGroupController.get);
});
