import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';
import { Middleware } from '../middlewares';
import { MemberGroupService } from '../services/member-group';

import { createUserAuthenticator } from './utils/user-authenticator';


export interface MemberGroupController {
  get: Middleware;
}

export const MemberGroupController = createToken<Promise<MemberGroupController>>(module, 'MemberGroupController');

// eslint-disable-next-line max-len
export const createMemberGroupController: DependencyCreator<Promise<MemberGroupController>> = async (appCtx) => {
  const [
    memberGroupService,
    authenticateUser
  ] = await appCtx.resolveAllAsync(
    MemberGroupService,
    createUserAuthenticator
  );

  const get: MemberGroupController['get'] = async (ctx) => {
    await authenticateUser(ctx);
    const batch = await memberGroupService.findLatestBatch();
    const resBody = batch.map((record) => ({
      name: record.name,
      count: record.count
    }));
    ctx.body = resBody;
  };

  return {
    get
  };
};

// eslint-disable-next-line max-len
export const registerMemberGroupController = createSingletonDependencyRegistrant(MemberGroupController, createMemberGroupController);
