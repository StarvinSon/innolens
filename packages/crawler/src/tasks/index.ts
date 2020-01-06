import { ContextFunction } from '../context';

import { initMemberTask } from './member';


export const initTasks: ContextFunction = (ctx) => {
  const registrants: ReadonlyArray<ContextFunction> = [
    initMemberTask
  ];
  for (const register of registrants) {
    register(ctx);
  }
};
