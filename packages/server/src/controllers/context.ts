import {
  ParameterizedContext, DefaultState, DefaultContext,
  Next
} from 'koa';


export type Context = ParameterizedContext<DefaultState, DefaultContext>;

export { Next };
