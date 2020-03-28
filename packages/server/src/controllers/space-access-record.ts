import { singleton, injectableConstructor } from '@innolens/resolver';

import { SpaceAccessRecordService } from '../services/space-access-record';


type PostSpaceAccessRecordBody = ReadonlyArray<{
  readonly memberId: string;
  readonly spaceId: string;
  readonly time: Date;
  readonly action: string;
}>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PostSpaceAccessRecordBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'memberId',
      'spaceId',
      'time',
      'action'
    ],
    properties: {
      memberId: {
        type: 'string'
      },
      spaceId: {
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
  spaceAccessRecordService: SpaceAccessRecordService
})
@singleton()
export class SpaceAccessRecordController {
  private readonly _spaceAccessRecordService: SpaceAccessRecordService;

  public constructor(deps: {
    spaceAccessRecordService: SpaceAccessRecordService;
  }) {
    ({
      spaceAccessRecordService: this._spaceAccessRecordService
    } = deps);
  }
}
