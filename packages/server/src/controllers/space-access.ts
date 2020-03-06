import { createToken, singleton, injectableConstructor } from '@innolens/resolver';

import { SpaceAccessService } from '../services/space-access';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { Middleware } from './middleware';
import { parseBody, InjectedBodyParserFactory, initializeParseBody } from './utils/body-parser';
import { validateBody, getValidatedBody } from './utils/body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


export interface SpaceAccessController {
  get: Middleware;
  post: Middleware;
}

export const SpaceAccessController =
  createToken<SpaceAccessController>('SpaceAccessController');


type PostSpaceAccessBody = ReadonlyArray<{
  readonly memberId: string;
  readonly spaceId: string;
  readonly startTime: Date;
  readonly endTime: Date;
}>;

const PostSpaceAccessBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'memberId',
      'spaceId',
      'startTime',
      'endTime'
    ],
    properties: {
      memberId: {
        type: 'string'
      },
      spaceId: {
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
  spaceAccessService: SpaceAccessService,
  userAuthenticator: UserAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory
})
@singleton()
export class SpaceAccessControllerImpl implements SpaceAccessController {
  private readonly _spaceAccessService: SpaceAccessService;

  public constructor(deps: {
    spaceAccessService: SpaceAccessService;
    userAuthenticator: UserAuthenticator;
    injectedBodyParserFactory: InjectedBodyParserFactory
  }) {
    ({
      spaceAccessService: this._spaceAccessService
    } = deps);
    initializeAuthenticateUser(SpaceAccessControllerImpl, this, deps.userAuthenticator);
    initializeParseBody(SpaceAccessControllerImpl, this, deps.injectedBodyParserFactory);
  }

  @authenticateUser()
  public async get(ctx: Context): Promise<void> {
    const spaceAccesses = await fromAsync(
      this._spaceAccessService.findAll()
    );
    ctx.body = spaceAccesses.map((spaceAccess) => ({
      memberId: spaceAccess.memberId,
      spaceId: spaceAccess.spaceId,
      startTime: spaceAccess.startTime.toISOString(),
      endTime: spaceAccess.endTime.toISOString()
    }));
  }

  @authenticateUser()
  @parseBody()
  @validateBody(PostSpaceAccessBody)
  public async post(ctx: Context): Promise<void> {
    const spaceAccesses = getValidatedBody<PostSpaceAccessBody>(ctx);
    await this._spaceAccessService.insertMany(spaceAccesses.map(
      (spaceAccess) => ({
        ...spaceAccess,
        startTime: new Date(spaceAccess.startTime),
        endTime: new Date(spaceAccess.endTime)
      })
    ));
    ctx.body = null;
  }
}
