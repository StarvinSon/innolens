import { MemberGroupController } from '../../controllers/member-group';
import { makeRoutesCreatorAsync } from '../utils/routes-creator';


export const createMemberGroupsRoutes = makeRoutesCreatorAsync(async (appCtx, router) => {
  const memberGroupController = await appCtx.resolve(MemberGroupController);

  router.get('/', memberGroupController.get);
});
