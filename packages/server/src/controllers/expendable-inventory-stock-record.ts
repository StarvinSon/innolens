import { singleton, injectableConstructor } from '@innolens/resolver/node';

import { ExpendableInventoryStockRecordService } from '../services/expendable-inventory-stock-record';


type PostExpendableInventoryStockRecordBody = ReadonlyArray<{
  readonly quantity: number;
  readonly time: Date;
  readonly inventoryId: string;
}>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  expendableInventoryStockRecordService: ExpendableInventoryStockRecordService
})
@singleton()
export class ExpendableInventoryStockRecordController {
  private readonly _expendableInventoryStockRecordService: ExpendableInventoryStockRecordService;

  public constructor(deps: {
    expendableInventoryStockRecordService: ExpendableInventoryStockRecordService;
  }) {
    ({
      expendableInventoryStockRecordService: this._expendableInventoryStockRecordService
    } = deps);
  }
}
