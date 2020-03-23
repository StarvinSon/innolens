import { createToken, singleton, injectableConstructor } from '@innolens/resolver';

import { SpaceAccessRecordService } from '../services/space-access-record';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { Middleware } from './middleware';
import { parseBody, InjectedBodyParserFactory, initializeParseBody } from './utils/body-parser';
import { validateRequestBody, getValidatedRequestBody } from './utils/request-body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


export interface SpaceAccessRecordController {
  get: Middleware;
  post: Middleware;
}

export const SpaceAccessRecordController =
  createToken<SpaceAccessRecordController>('SpaceAccessRecordController');


type PostSpaceAccessRecordBody = ReadonlyArray<{
  readonly memberId: string;
  readonly spaceId: string;
  readonly time: Date;
  readonly action: string;
}>;

const PostSpaceAccessRecordBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'memberId',
      'spaceId',
      'time',
      'action'
    ],
    properties: {
      memberId: {
        type: 'string'
      },
      spaceId: {
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
  spaceAccessRecordService: SpaceAccessRecordService,
  userAuthenticator: UserAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory
})
@singleton()
export class SpaceAccessRecordControllerImpl implements SpaceAccessRecordController {
  private readonly _spaceAccessRecordService: SpaceAccessRecordService;

  public constructor(deps: {
    spaceAccessRecordService: SpaceAccessRecordService;
    userAuthenticator: UserAuthenticator;
    injectedBodyParserFactory: InjectedBodyParserFactory
  }) {
    ({
      spaceAccessRecordService: this._spaceAccessRecordService
    } = deps);
    initializeAuthenticateUser(SpaceAccessRecordControllerImpl, this, deps.userAuthenticator);
    initializeParseBody(SpaceAccessRecordControllerImpl, this, deps.injectedBodyParserFactory);
  }

  @authenticateUser()
  public async get(ctx: Context): Promise<void> {
    const records = await fromAsync(this._spaceAccessRecordService.findAll());
    ctx.body = records.map((spaceAccess) => ({
      memberId: spaceAccess.memberId,
      spaceId: spaceAccess.spaceId,
      time: spaceAccess.time.toISOString(),
      action: spaceAccess.action
    }));
  }

  @authenticateUser()
  @parseBody()
  @validateRequestBody(PostSpaceAccessRecordBody)
  public async post(ctx: Context): Promise<void> {
    const records = getValidatedRequestBody<PostSpaceAccessRecordBody>(ctx);
    await this._spaceAccessRecordService
      .insertMany(records.map((record) => ({
        ...record,
        time: new Date(record.time)
      })));
    ctx.body = null;
  }
}
