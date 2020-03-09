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

export const InventoryController = createToken<InventoryController>('InventoryController');


type PostInventoryBody = ReadonlyArray<{
  readonly inventoryId: string;
  readonly inventoryName: string;
} & ({
  readonly type: 'expendable';
} | {
  readonly type: 'reusable';
  readonly items: ReadonlyArray<{
    readonly itemId: string;
  }>;
})>;

const PostInventoryBody = ((): object => {
  const base = {
    type: 'object',
    additionalProperties: false,
    required: [
      'inventoryId',
      'inventoryName'
    ],
    properties: {
      inventoryId: {
        type: 'string'
      },
      inventoryName: {
        type: 'string'
      }
    }
  };

  const expendable = {
    ...base,
    required: [
      ...base.required,
      'type'
    ],
    properties: {
      ...base.properties,
      type: {
        const: 'expendable'
      }
    }
  };

  const reusable = {
    ...base,
    required: [
      ...base.required,
      'type'
    ],
    properties: {
      ...base.properties,
      type: {
        const: 'reusable'
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'itemId'
          ],
          properties: {
            itemId: {
              type: 'string'
            }
          }
        }
      }
    }
  };

  return {
    type: 'array',
    items: {
      oneOf: [
        expendable,
        reusable
      ]
    }
  };
})();

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
      type: inventory.type,
      ...inventory.type === 'expendable'
        ? {}
        : {
          items: inventory.items.map((item) => ({
            itemId: item.itemId
          }))
        }
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
