import { createToken, createAsyncSingletonRegistrant } from '../resolver';
import { Middleware } from '../middlewares';
import { MemberService } from '../services/member';
import { fromAsync } from '../utils/array';

import { UserAuthenticator } from './utils/user-authenticator';
import { Context } from './context';


export interface MemberController {
  get: Middleware;
}


export class MemberControllerImpl implements MemberController {
  private readonly _memberService: MemberService;
  private readonly _userAuthenticator: UserAuthenticator;

  public constructor(options: {
    memberService: MemberService;
    userAuthenticator: UserAuthenticator;
  }) {
    ({
      memberService: this._memberService,
      userAuthenticator: this._userAuthenticator
    } = options);
  }

  public async get(ctx: Context): Promise<void> {
    await this._userAuthenticator(ctx);
    ctx.body = await fromAsync(this._memberService.find());
  }
}


export const MemberController =
  createToken<Promise<MemberController>>(__filename, 'MemberController');

export const registerMemberController = createAsyncSingletonRegistrant(
  MemberController,
  {
    memberService: MemberService,
    userAuthenticator: UserAuthenticator
  },
  (opts) => new MemberControllerImpl(opts)
);
