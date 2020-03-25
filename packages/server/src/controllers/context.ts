import {
  ParameterizedContext, DefaultState, DefaultContext,
  Next
} from 'koa';


export interface Context extends ParameterizedContext<DefaultState, DefaultContext> {}

export { Next };
