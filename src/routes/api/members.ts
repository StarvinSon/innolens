import { MembersController } from '../../controllers/members';
import { makeRoutesCreatorAsync } from '../common';


export const createMembersRoutes = makeRoutesCreatorAsync(async (appCtx, router) => {
  const membersController = await appCtx.resolve(MembersController);

  router.get('/', membersController.get);
});
