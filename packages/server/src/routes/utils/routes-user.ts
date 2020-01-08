import { Resolver } from '../../resolver';
import { Router } from '../router';

import { RoutesCreator, RoutesCreatorAsync } from './routes-creator';


export const useRoutes = (
  resolver: Resolver,
  router: Router,
  creators: ReadonlyArray<readonly [string | ReadonlyArray<string> | RegExp, RoutesCreator]>
): void => {
  for (const [path, creator] of creators) {
    router.use(path as string | Array<string> | RegExp, ...creator(resolver));
  }
};

export const useRoutesAsync = async (
  resolver: Resolver,
  router: Router,
  // eslint-disable-next-line max-len
  creators: ReadonlyArray<readonly [string | ReadonlyArray<string> | RegExp, RoutesCreator | RoutesCreatorAsync]>
): Promise<void> => {
  await creators.reduce(async (prev, [path, creator]) => {
    const [rs] = await Promise.all([
      creator(resolver),
      prev
    ]);
    router.use(path as string | Array<string> | RegExp, ...rs);
  }, Promise.resolve());
};
