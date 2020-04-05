import { RouterContext as KoaRouterContext } from '@koa/router';
import {
  ParameterizedContext, DefaultState, DefaultContext,
  Next
} from 'koa';


export interface Context extends ParameterizedContext<DefaultState, DefaultContext> {}

export { Next };

export interface RouterContext extends KoaRouterContext<DefaultState, DefaultContext> {}
