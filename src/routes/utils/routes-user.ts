import { AppContext } from '../../app-context';

import { Router } from './router';
import { RoutesCreator, RoutesCreatorAsync } from './routes-creator';


export const useRoutes = (
  appCtx: AppContext,
  router: Router,
  creators: ReadonlyArray<readonly [string, RoutesCreator]>
): void => {
  for (const [path, creator] of creators) {
    router.use(path, ...creator(appCtx));
  }
};

export const useRoutesAsync = async (
  appCtx: AppContext,
  router: Router,
  // eslint-disable-next-line max-len
  creators: ReadonlyArray<readonly [string | ReadonlyArray<string> | RegExp, RoutesCreator | RoutesCreatorAsync]>
): Promise<void> => {
  await creators.reduce(async (prev, [path, creator]) => {
    const [rs] = await Promise.all([
      creator(appCtx),
      prev
    ]);
    router.use(path as any, ...rs);
  }, Promise.resolve());
};
