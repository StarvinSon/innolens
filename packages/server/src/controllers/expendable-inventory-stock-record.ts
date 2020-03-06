import { createToken, singleton, injectableConstructor } from '@innolens/resolver';

import { ExpendableInventoryStockRecordService } from '../services/expendable-inventory-stock-record';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { Middleware } from './middleware';
import { parseBody, InjectedBodyParserFactory, initializeParseBody } from './utils/body-parser';
import { validateBody, getValidatedBody } from './utils/body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


export interface ExpendableInventoryStockRecordController {
  get: Middleware;
  post: Middleware;
}

export const ExpendableInventoryStockRecordController =
  createToken<ExpendableInventoryStockRecordController>('ExpendableInventoryStockRecordController');


type PostExpendableInventoryStockRecordBody = ReadonlyArray<{
  readonly quantity: number;
  readonly date: Date;
  readonly inventoryId: string;
}>;

const PostExpendableInventoryStockRecordBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'quantity',
      'date',
      'inventoryId'
    ],
    properties: {
      quantity: {
        bsonType: 'double'
      },
      date: {
        bsonType: 'date'
      },
      inventoryId: {
        bsonType: 'string'
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
    initializeAuthenticateUser(ExpendableInventoryStockRecordControllerImpl, this, deps.userAuthenticator);
    initializeParseBody(ExpendableInventoryStockRecordControllerImpl, this, deps.injectedBodyParserFactory);
  }

  @authenticateUser()
  public async get(ctx: Context): Promise<void> {
    const expendableInventoryStockRecords = await fromAsync(this._expendableInventoryStockRecordService.findAll());
    ctx.body = expendableInventoryStockRecords.map((expendableInventoryStockRecord) => ({
      quantity: expendableInventoryStockRecord.quantity,
      date: expendableInventoryStockRecord.date.toISOString(),
      inventoryId: expendableInventoryStockRecord.inventoryId
    }));
  }

  @authenticateUser()
  @parseBody()
  @validateBody(PostExpendableInventoryStockRecordBody)
  public async post(ctx: Context): Promise<void> {
    const expendableInventoryStockRecords = getValidatedBody<PostExpendableInventoryStockRecordBody>(ctx);
    await this._expendableInventoryStockRecordService.insertMany(expendableInventoryStockRecords.map(
      (expendableInventoryStockRecord) => ({
        ...expendableInventoryStockRecord,
        date: new Date(expendableInventoryStockRecord.date)
      })
    ));
    ctx.body = null;
  }
}
