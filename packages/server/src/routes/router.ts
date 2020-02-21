import KoaRouter from '@koa/router';
import { DefaultState, DefaultContext } from 'koa';


export type Router = KoaRouter<DefaultState, DefaultContext>;

export const createRouter = (): Router => new KoaRouter();


export const nest = <S, C>(
  router: KoaRouter<S, C>,
  path: string | Array<string> | RegExp,
  nestRouter: KoaRouter<S, C>
): KoaRouter<S, C> => {
  router.use(path, nestRouter.allowedMethods(), nestRouter.routes());
  return router;
};
