import { UserController } from '../../controllers/user';
import { makeRoutesCreatorAsync } from '../utils/routes-creator';
import { bindAsyncController } from '../utils/bind-controller';


export const createUsersRoutes = makeRoutesCreatorAsync(async (resolver, router) => {
  const userController = await resolver.resolve(bindAsyncController(UserController));

  router.get('/:username', userController.getByUsername);
});
