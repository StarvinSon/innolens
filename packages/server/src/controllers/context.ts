import {
  ParameterizedContext, DefaultState, DefaultContext,
  Next
} from 'koa';


export interface Context<T = any> extends ParameterizedContext<DefaultState, DefaultContext> {
  body: T;
}

export { Next };
