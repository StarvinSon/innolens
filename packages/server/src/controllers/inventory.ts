import { createToken, singleton, injectableConstructor } from '@innolens/resolver';

import { InventoryService } from '../services/inventory';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { Middleware } from './middleware';
import { parseBody, InjectedBodyParserFactory, initializeParseBody } from './utils/body-parser';
import { validateBody, getValidatedBody } from './utils/body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


export interface InventoryController {
  get: Middleware;
  post: Middleware;
}

export const InventoryController =
  createToken<InventoryController>('InventoryController');


type PostInventoryBody = ReadonlyArray<{
  readonly inventoryId: string;
  readonly inventoryName: string;
  readonly isReusable: boolean;
  readonly type: string;
  readonly inventories: Array<{
    reusableInventoryId: string;
    status: string;
  }>;
}>;

const PostInventoryBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'inventoryId',
      'inventoryName',
      'isReusable',
      'type',
      'inventories'
    ],
    properties: {
      inventoryId: {
        bsonType: 'string'
      },
      inventoryName: {
        bsonType: 'string'
      },
      isReusable: {
        bsonType: 'bool'
      },
      type: {
        bsonType: 'string'
      },
      inventories: {
        bsonType: 'array'
      }
    }
  }
};

@injectableConstructor({
  inventoryService: InventoryService,
  userAuthenticator: UserAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory
})
@singleton()
export class InventoryControllerImpl implements InventoryController {
  private readonly _inventoryService: InventoryService;

  public constructor(deps: {
    inventoryService: InventoryService;
    userAuthenticator: UserAuthenticator;
    injectedBodyParserFactory: InjectedBodyParserFactory
  }) {
    ({
      inventoryService: this._inventoryService
    } = deps);
    initializeAuthenticateUser(InventoryControllerImpl, this, deps.userAuthenticator);
    initializeParseBody(InventoryControllerImpl, this, deps.injectedBodyParserFactory);
  }

  @authenticateUser()
  public async get(ctx: Context): Promise<void> {
    const inventories = await fromAsync(this._inventoryService.findAll());
    ctx.body = inventories.map((inventory) => ({
      inventoryId: inventory.inventoryId,
      inventoryName: inventory.inventoryName,
      isReusable: inventory.isReusable,
      type: inventory.type,
      inventories: inventory.inventories
    }));
  }

  @authenticateUser()
  @parseBody()
  @validateBody(PostInventoryBody)
  public async post(ctx: Context): Promise<void> {
    const inventories = getValidatedBody<PostInventoryBody>(ctx);
    await this._inventoryService.insertMany(inventories);
    ctx.body = null;
  }
}
