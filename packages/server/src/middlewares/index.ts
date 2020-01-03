import { Middleware as KoaMiddleware, DefaultState, DefaultContext } from 'koa';
import { IMiddleware as KoaRouterMiddleware } from 'koa-router';


export type Middleware = KoaMiddleware<DefaultState, DefaultContext>;
export type RouterMiddleware = KoaRouterMiddleware<DefaultState, DefaultContext>;
