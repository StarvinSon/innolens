import Router, { IMiddleware } from 'koa-router';
import { DefaultState, DefaultContext, Middleware } from 'koa';


export type AppMiddleware = Middleware<DefaultState, DefaultContext>;

export type AppRouter = Router<DefaultState, DefaultContext>;
export type AppRouterMiddleware = IMiddleware<DefaultState, DefaultContext>;
