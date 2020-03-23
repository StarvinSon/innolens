import { createToken, singleton, injectableConstructor } from '@innolens/resolver';

import { ReusableInventoryUsageRecordService } from '../services/reusable-inventory-usage-record';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { Middleware } from './middleware';
import { parseBody, InjectedBodyParserFactory, initializeParseBody } from './utils/body-parser';
import { validateRequestBody, getValidatedRequestBody } from './utils/request-body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


export interface ReusableInventoryUsageRecordController {
  get: Middleware;
  post: Middleware;
}

export const ReusableInventoryUsageRecordController =
  createToken<ReusableInventoryUsageRecordController>('ReusableInventoryUsageRecordController');


type PostReusableInventoryUsageRecordBody = ReadonlyArray<{
  readonly memberId: string;
  readonly reusableInventoryItemId: string;
  readonly time: string;
  readonly action: string;
}>;

const PostReusableInventoryUsageRecordBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'memberId',
      'reusableInventoryItemId',
      'time',
      'action'
    ],
    properties: {
      memberId: {
        type: 'string'
      },
      reusableInventoryItemId: {
        type: 'string'
      },
      time: {
        type: 'string'
      },
      action: {
        type: 'string'
      }
    }
  }
};

@injectableConstructor({
  reusableInventoryUsageRecordService: ReusableInventoryUsageRecordService,
  userAuthenticator: UserAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory
})
@singleton()
// eslint-disable-next-line max-len
export class ReusableInventoryUsageRecordControllerImpl implements ReusableInventoryUsageRecordController {
  private readonly _reusableInventoryRecordUsageService: ReusableInventoryUsageRecordService;

  public constructor(deps: {
    reusableInventoryUsageRecordService: ReusableInventoryUsageRecordService;
    userAuthenticator: UserAuthenticator;
    injectedBodyParserFactory: InjectedBodyParserFactory
  }) {
    ({
      reusableInventoryUsageRecordService: this._reusableInventoryRecordUsageService
    } = deps);
    // eslint-disable-next-line max-len
    initializeAuthenticateUser(ReusableInventoryUsageRecordControllerImpl, this, deps.userAuthenticator);
    // eslint-disable-next-line max-len
    initializeParseBody(ReusableInventoryUsageRecordControllerImpl, this, deps.injectedBodyParserFactory);
  }

  @authenticateUser()
  public async get(ctx: Context): Promise<void> {
    const records = await fromAsync(this._reusableInventoryRecordUsageService.findAll());
    ctx.body = records.map((record) => ({
      memberId: record.memberId,
      reusableInventoryItemId: record.reusableInventoryItemId,
      time: record.time.toISOString(),
      action: record.action
    }));
  }

  @authenticateUser()
  @parseBody()
  @validateRequestBody(PostReusableInventoryUsageRecordBody)
  public async post(ctx: Context): Promise<void> {
    const records = getValidatedRequestBody<PostReusableInventoryUsageRecordBody>(ctx);
    await this._reusableInventoryRecordUsageService
      .insertMany(records.map((record) => ({
        ...record,
        time: new Date(record.time)
      })));
    ctx.body = null;
  }
}
