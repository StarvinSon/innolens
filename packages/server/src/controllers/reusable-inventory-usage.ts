import { createToken, singleton, injectableConstructor } from '@innolens/resolver';

import { ReusableInventoryUsageService } from '../services/reusable-inventory-usage';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { Middleware } from './middleware';
import { parseBody, InjectedBodyParserFactory, initializeParseBody } from './utils/body-parser';
import { validateBody, getValidatedBody } from './utils/body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


export interface ReusableInventoryUsageController {
  get: Middleware;
  post: Middleware;
}

export const ReusableInventoryUsageController =
  createToken<ReusableInventoryUsageController>('ReusableInventoryUsageController');


type PostReusableInventoryUsageBody = ReadonlyArray<{
  readonly memberId: string;
  readonly reusableInventoryId: string;
  readonly startTime: Date;
  readonly endTime: Date;
}>;

const PostReusableInventoryUsageBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'memberId',
      'reusableInventoryId',
      'startTime',
      'endTime'
    ],
    properties: {
      memberId: {
        type: 'string'
      },
      reusableInventoryId: {
        type: 'string'
      },
      startTime: {
        type: 'string'
      },
      endTime: {
        type: 'string'
      }
    }
  }
};

@injectableConstructor({
  reusableInventoryUsageService: ReusableInventoryUsageService,
  userAuthenticator: UserAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory
})
@singleton()
export class ReusableInventoryUsageControllerImpl implements ReusableInventoryUsageController {
  private readonly _reusableInventoryUsageService: ReusableInventoryUsageService;

  public constructor(deps: {
    reusableInventoryUsageService: ReusableInventoryUsageService;
    userAuthenticator: UserAuthenticator;
    injectedBodyParserFactory: InjectedBodyParserFactory
  }) {
    ({
      reusableInventoryUsageService: this._reusableInventoryUsageService
    } = deps);
    initializeAuthenticateUser(ReusableInventoryUsageControllerImpl, this, deps.userAuthenticator);
    initializeParseBody(ReusableInventoryUsageControllerImpl, this, deps.injectedBodyParserFactory);
  }

  @authenticateUser()
  public async get(ctx: Context): Promise<void> {
    const reusableInventoryUsageList = await fromAsync(
      this._reusableInventoryUsageService.findAll()
    );
    ctx.body = reusableInventoryUsageList.map((reusableInventoryUsage) => ({
      memberId: reusableInventoryUsage.memberId,
      reusableInventoryId: reusableInventoryUsage.reusableInventoryId,
      startTime: reusableInventoryUsage.startTime.toISOString(),
      endTime: reusableInventoryUsage.endTime.toISOString()
    }));
  }

  @authenticateUser()
  @parseBody()
  @validateBody(PostReusableInventoryUsageBody)
  public async post(ctx: Context): Promise<void> {
    const reusableInventoryUsageList = getValidatedBody<PostReusableInventoryUsageBody>(ctx);
    await this._reusableInventoryUsageService.insertMany(reusableInventoryUsageList.map(
      (reusableInventoryUsage) => ({
        ...reusableInventoryUsage,
        startTime: new Date(reusableInventoryUsage.startTime),
        endTime: new Date(reusableInventoryUsage.endTime)
      })
    ));
    ctx.body = null;
  }
}
