import { singleton, injectableConstructor } from '@innolens/resolver';

import { ReusableInventoryService } from '../services/reusable-inventory';


type PostReusableInventoryBody = ReadonlyArray<{
  readonly inventoryId: string;
  readonly reusableInventoryItemId: string;
  readonly status: string;
}>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  reusableInventoryService: ReusableInventoryService
})
@singleton()
export class ReusableInventoryController {
  private readonly _reusableInventoryService: ReusableInventoryService;

  public constructor(deps: {
    reusableInventoryService: ReusableInventoryService;
  }) {
    ({
      reusableInventoryService: this._reusableInventoryService
    } = deps);
  }
}
