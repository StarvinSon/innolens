import { createToken, singleton, injectableConstructor } from '@innolens/resolver';

import { SpaceService } from '../services/space';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { Middleware } from './middleware';
import { parseBody, InjectedBodyParserFactory, initializeParseBody } from './utils/body-parser';
import { validateBody, getValidatedBody } from './utils/body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


export interface SpaceController {
  get: Middleware;
  post: Middleware;
}

export const SpaceController = createToken<SpaceController>('SpaceController');


type PostSpaceBody = ReadonlyArray<{
  readonly spaceId: string;
  readonly spaceName: string;
  readonly floor: string;
  readonly indoor: boolean;
}>;

const PostSpaceBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'spaceId',
      'spaceName',
      'floor',
      'indoor'
    ],
    properties: {
      spaceId: {
        type: 'string'
      },
      spaceName: {
        type: 'string'
      },
      floor: {
        type: 'string'
      },
      indoor: {
        type: 'boolean'
      }
    }
  }
};

@injectableConstructor({
  spaceService: SpaceService,
  userAuthenticator: UserAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory
})
@singleton()
export class SpaceControllerImpl implements SpaceController {
  private readonly _spaceService: SpaceService;

  public constructor(deps: {
    spaceService: SpaceService;
    userAuthenticator: UserAuthenticator;
    injectedBodyParserFactory: InjectedBodyParserFactory
  }) {
    ({
      spaceService: this._spaceService
    } = deps);
    initializeAuthenticateUser(SpaceControllerImpl, this, deps.userAuthenticator);
    initializeParseBody(SpaceControllerImpl, this, deps.injectedBodyParserFactory);
  }

  @authenticateUser()
  public async get(ctx: Context): Promise<void> {
    const spaces = await fromAsync(this._spaceService.findAll());
    ctx.body = spaces.map((space) => ({
      spaceId: space.spaceId,
      spaceName: space.spaceName,
      floor: space.floor,
      indoor: space.indoor
    }));
  }

  @authenticateUser()
  @parseBody()
  @validateBody(PostSpaceBody)
  public async post(ctx: Context): Promise<void> {
    const spaces = getValidatedBody<PostSpaceBody>(ctx);
    await this._spaceService.insertMany(spaces);
    ctx.body = null;
  }
}
