import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';
import { Middleware } from '../middlewares';
import { MemberService } from '../services/member';
import { fromAsync } from '../utils/array';

import { createUserAuthenticator } from './utils/user-authenticator';


export interface MemberController {
  get: Middleware;
}

export const MemberController = createToken<Promise<MemberController>>(module, 'MemberController');

// eslint-disable-next-line max-len
export const createMemberController: DependencyCreator<Promise<MemberController>> = async (appCtx) => {
  const [
    memberService,
    authenticateUser
  ] = await appCtx.resolveAllAsync(
    MemberService,
    createUserAuthenticator
  );

  const get: Middleware = async (ctx) => {
    await authenticateUser(ctx);
    ctx.body = await fromAsync(memberService.find());
  };

  return {
    get
  };
};

// eslint-disable-next-line max-len
export const registerMemberController = createSingletonDependencyRegistrant(MemberController, createMemberController);
