import { singleton, injectableConstructor } from '@innolens/resolver';

import { MachineUsageService } from '../services/machine-usage';


type PostMachineUsageBody = ReadonlyArray<{
  readonly machineId: string;
  readonly memberId: string;
  readonly time: Date;
  readonly action: string;
}>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PostMachineUsageBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'machineId',
      'memberId',
      'time',
      'action'
    ],
    properties: {
      machineId: {
        type: 'string'
      },
      memberId: {
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
  machineUsageService: MachineUsageService
})
@singleton()
export class MachineUsageController {
  private readonly _machineUsageService: MachineUsageService;

  public constructor(deps: {
    machineUsageService: MachineUsageService;
  }) {
    ({
      machineUsageService: this._machineUsageService
    } = deps);
  }
}
