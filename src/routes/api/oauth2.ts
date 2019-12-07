import { OAuth2Controller } from '../../controllers/oauth2';
import { makeRoutesCreatorAsync } from '../common';


export const createOAuth2Routes = makeRoutesCreatorAsync(async (appCtx, router) => {
  const oauth2Controller = await appCtx.resolve(OAuth2Controller);

  router.use(oauth2Controller.handleError);
  router.post('/token', oauth2Controller.postToken);
});
