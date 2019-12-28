import { DefaultState, DefaultContext } from 'koa';
import KoaRouter from 'koa-router';


export type Router = KoaRouter<DefaultState, DefaultContext>;
