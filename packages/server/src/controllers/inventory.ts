import { singleton, injectableConstructor } from '@innolens/resolver';

import { InventoryService } from '../services/inventory';


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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  inventoryService: InventoryService
})
@singleton()
export class InventoryController {
  private readonly _inventoryService: InventoryService;

  public constructor(deps: {
    inventoryService: InventoryService;
  }) {
    ({
      inventoryService: this._inventoryService
    } = deps);
  }
}
