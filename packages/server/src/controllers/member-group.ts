import { createToken, createAsyncSingletonRegistrant } from '../resolver';
import { Middleware } from '../middlewares';
import { MemberGroupService } from '../services/member-group';

import { UserAuthenticator } from './utils/user-authenticator';
import { Context } from './context';


export interface MemberGroupController {
  get: Middleware;
}


export class MemberGroupControllerImpl implements MemberGroupController {
  private readonly _memberGroupService: MemberGroupService;
  private readonly _userAuthenticator: UserAuthenticator;

  public constructor(options: {
    memberGroupService: MemberGroupService,
    userAuthenticator: UserAuthenticator
  }) {
    ({
      memberGroupService: this._memberGroupService,
      userAuthenticator: this._userAuthenticator
    } = options);
  }

  public async get(ctx: Context): Promise<void> {
    await this._userAuthenticator(ctx);
    const batch = await this._memberGroupService.findLatestBatch();
    const resBody = batch.map((record) => ({
      name: record.name,
      count: record.count
    }));
    ctx.body = resBody;
  }
}


export const MemberGroupController =
  createToken<Promise<MemberGroupController>>(__filename, 'MemberGroupController');

export const registerMemberGroupController = createAsyncSingletonRegistrant(
  MemberGroupController,
  {
    memberGroupService: MemberGroupService,
    userAuthenticator: UserAuthenticator
  },
  (opts) => new MemberGroupControllerImpl(opts)
);
