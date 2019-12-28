import { MemberGroupsController } from '../../controllers/member-groups';
import { makeRoutesCreatorAsync } from '../utils/routes-creator';


export const createMemberGroupsRoutes = makeRoutesCreatorAsync(async (appCtx, router) => {
  const memberGroupsController = await appCtx.resolve(MemberGroupsController);

  router.get('/', memberGroupsController.get);
});
