import { createToken, singleton, injectableConstructor } from '@innolens/resolver';

import { ReusableInventoryService } from '../services/reusable-inventory';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { Middleware } from './middleware';
import { parseBody, InjectedBodyParserFactory, initializeParseBody } from './utils/body-parser';
import { validateBody, getValidatedBody } from './utils/body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


export interface ReusableInventoryController {
  get: Middleware;
  post: Middleware;
}

export const ReusableInventoryController =
  createToken<ReusableInventoryController>('ReusableInventoryController');


type PostReusableInventoryBody = ReadonlyArray<{
  readonly inventoryId: string;
  readonly reusableInventoryItemId: string;
  readonly status: string;
}>;

const PostReusableInventoryBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'inventoryId',
      'reusableInventoryItemId',
      'status'
    ],
    properties: {
      inventoryId: {
        type: 'string'
      },
      reusableInventoryItemId: {
        type: 'string'
      },
      status: {
        type: 'string'
      }
    }
  }
};

@injectableConstructor({
  reusableInventoryService: ReusableInventoryService,
  userAuthenticator: UserAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory
})
@singleton()
export class ReusableInventoryControllerImpl implements ReusableInventoryController {
  private readonly _reusableInventoryService: ReusableInventoryService;

  public constructor(deps: {
    reusableInventoryService: ReusableInventoryService;
    userAuthenticator: UserAuthenticator;
    injectedBodyParserFactory: InjectedBodyParserFactory
  }) {
    ({
      reusableInventoryService: this._reusableInventoryService
    } = deps);
    initializeAuthenticateUser(ReusableInventoryControllerImpl, this, deps.userAuthenticator);
    initializeParseBody(ReusableInventoryControllerImpl, this, deps.injectedBodyParserFactory);
  }

  @authenticateUser()
  public async get(ctx: Context): Promise<void> {
    const inventories = await fromAsync(this._reusableInventoryService.findAll());
    ctx.body = inventories.map((inventory) => ({
      inventoryId: inventory.inventoryId,
      reusableInventoryItemId: inventory.reusableInventoryItemId,
      status: inventory.status
    }));
  }

  @authenticateUser()
  @parseBody()
  @validateBody(PostReusableInventoryBody)
  public async post(ctx: Context): Promise<void> {
    const inventories = getValidatedBody<PostReusableInventoryBody>(ctx);
    await this._reusableInventoryService.insertMany(inventories);
    ctx.body = null;
  }
}
