import { OAuth2Controller } from '../../controllers/oauth2';
import { makeRoutesCreatorAsync } from '../utils/routes-creator';
import { bindAsyncController } from '../utils/bind-controller';


export const createOAuth2Routes = makeRoutesCreatorAsync(async (resolver, router) => {
  const oauth2Controller = await resolver.resolve(bindAsyncController(OAuth2Controller));

  router.use(oauth2Controller.handleError);
  router.post('/token', oauth2Controller.postToken);
});
