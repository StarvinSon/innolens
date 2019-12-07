import { UsersController } from '../../controllers/users';
import { makeRoutesCreatorAsync } from '../common';


export const createUsersRoutes = makeRoutesCreatorAsync(async (appCtx, router) => {
  const usersController = await appCtx.resolve(UsersController);

  router.get('/:username', usersController.getByUsername);
});
