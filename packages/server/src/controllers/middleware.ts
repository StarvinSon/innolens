import { Middleware as KoaRouterMiddleware } from '@koa/router';
import { Middleware as KoaMiddleware, DefaultState, DefaultContext } from 'koa';


export type Middleware = KoaMiddleware<DefaultState, DefaultContext>;

export type RouterMiddleware = KoaRouterMiddleware<DefaultState, DefaultContext>;
