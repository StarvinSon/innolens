import { UserController } from '../../controllers/user';
import { makeRoutesCreatorAsync } from '../utils/routes-creator';


export const createUsersRoutes = makeRoutesCreatorAsync(async (appCtx, router) => {
  const userController = await appCtx.resolve(UserController);

  router.get('/:username', userController.getByUsername);
});
