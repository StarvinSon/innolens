import { createToken, singleton, injectableConstructor } from '@innolens/resolver';

import { ExpendableInventoryStockRecordService } from '../services/expendable-inventory-stock-record';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { Middleware } from './middleware';
import { parseBody, InjectedBodyParserFactory, initializeParseBody } from './utils/body-parser';
import { validateRequestBody, getValidatedRequestBody } from './utils/request-body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


export interface ExpendableInventoryStockRecordController {
  get: Middleware;
  post: Middleware;
}

export const ExpendableInventoryStockRecordController =
  createToken<ExpendableInventoryStockRecordController>('ExpendableInventoryStockRecordController');


type PostExpendableInventoryStockRecordBody = ReadonlyArray<{
  readonly quantity: number;
  readonly time: Date;
  readonly inventoryId: string;
}>;

const PostExpendableInventoryStockRecordBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'inventoryId',
      'time',
      'quantity'
    ],
    properties: {
      inventoryId: {
        type: 'string'
      },
      time: {
        type: 'string'
      },
      quantity: {
        type: 'number'
      }
    }
  }
};

@injectableConstructor({
  expendableInventoryStockRecordService: ExpendableInventoryStockRecordService,
  userAuthenticator: UserAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory
})
@singleton()
// eslint-disable-next-line max-len
export class ExpendableInventoryStockRecordControllerImpl implements ExpendableInventoryStockRecordController {
  private readonly _expendableInventoryStockRecordService: ExpendableInventoryStockRecordService;

  public constructor(deps: {
    expendableInventoryStockRecordService: ExpendableInventoryStockRecordService;
    userAuthenticator: UserAuthenticator;
    injectedBodyParserFactory: InjectedBodyParserFactory
  }) {
    ({
      expendableInventoryStockRecordService: this._expendableInventoryStockRecordService
    } = deps);
    // eslint-disable-next-line max-len
    initializeAuthenticateUser(ExpendableInventoryStockRecordControllerImpl, this, deps.userAuthenticator);
    // eslint-disable-next-line max-len
    initializeParseBody(ExpendableInventoryStockRecordControllerImpl, this, deps.injectedBodyParserFactory);
  }

  @authenticateUser()
  public async get(ctx: Context): Promise<void> {
    const records = await fromAsync(this._expendableInventoryStockRecordService.findAll());
    ctx.body = records.map((record) => ({
      inventoryId: record.inventoryId,
      date: record.time.toISOString(),
      quantity: record.quantity
    }));
  }

  @authenticateUser()
  @parseBody()
  @validateRequestBody(PostExpendableInventoryStockRecordBody)
  public async post(ctx: Context): Promise<void> {
    const records = getValidatedRequestBody<PostExpendableInventoryStockRecordBody>(ctx);
    await this._expendableInventoryStockRecordService
      .insertMany(records.map((record) => ({
        ...record,
        time: new Date(record.time)
      })));
    ctx.body = null;
  }
}
