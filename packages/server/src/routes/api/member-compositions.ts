import { MemberCompositionController } from '../../controllers/member-composition';
import { makeRoutesCreatorAsync } from '../utils/routes-creator';
import { bindAsyncController } from '../utils/bind-controller';


export const createMemberCompositionRoutes = makeRoutesCreatorAsync(async (resolver, router) => {
  const memberCompositionController = await resolver.resolve(
    bindAsyncController(MemberCompositionController)
  );

  router.get('/', memberCompositionController.get);
  router.post('/', memberCompositionController.post);
});
