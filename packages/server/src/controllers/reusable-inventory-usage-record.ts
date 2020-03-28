import { singleton, injectableConstructor } from '@innolens/resolver';

import { ReusableInventoryUsageRecordService } from '../services/reusable-inventory-usage-record';


type PostReusableInventoryUsageRecordBody = ReadonlyArray<{
  readonly memberId: string;
  readonly reusableInventoryItemId: string;
  readonly time: string;
  readonly action: string;
}>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PostReusableInventoryUsageRecordBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'memberId',
      'reusableInventoryItemId',
      'time',
      'action'
    ],
    properties: {
      memberId: {
        type: 'string'
      },
      reusableInventoryItemId: {
        type: 'string'
      },
      time: {
        type: 'string'
      },
      action: {
        type: 'string'
      }
    }
  }
};

@injectableConstructor({
  reusableInventoryUsageRecordService: ReusableInventoryUsageRecordService
})
@singleton()
export class ReusableInventoryUsageRecordController {
  private readonly _reusableInventoryRecordUsageService: ReusableInventoryUsageRecordService;

  public constructor(deps: {
    reusableInventoryUsageRecordService: ReusableInventoryUsageRecordService;
  }) {
    ({
      reusableInventoryUsageRecordService: this._reusableInventoryRecordUsageService
    } = deps);
  }
}
