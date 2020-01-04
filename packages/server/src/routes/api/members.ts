import { MemberController } from '../../controllers/member';
import { makeRoutesCreatorAsync } from '../utils/routes-creator';


export const createMembersRoutes = makeRoutesCreatorAsync(async (appCtx, router) => {
  const memberController = await appCtx.resolve(MemberController);

  router.get('/', memberController.get);
});
