import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';
import { Middleware } from '../middlewares';
import { MemberGroupsService } from '../services/member-groups';

import { createUserAuthenticator } from './utils/user-authenticator';


export interface MemberGroupsController {
  get: Middleware;
}

export const MemberGroupsController = createToken<Promise<MemberGroupsController>>(module, 'MemberGroupsController');

// eslint-disable-next-line max-len
export const createMemberGroupsController: DependencyCreator<Promise<MemberGroupsController>> = async (appCtx) => {
  const [
    memberGroupsService,
    authenticateUser
  ] = await appCtx.resolveAllAsync(
    MemberGroupsService,
    createUserAuthenticator
  );

  const get: MemberGroupsController['get'] = async (ctx) => {
    await authenticateUser(ctx);
    const batch = await memberGroupsService.findLatestBatch();
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
export const registerMemberGroupsController = createSingletonDependencyRegistrant(MemberGroupsController, createMemberGroupsController);
