import { singleton, injectableConstructor } from '@innolens/resolver';

import { MachineService } from '../services/machine';


type PostMachineBody = ReadonlyArray<{
  readonly machineId: string;
  readonly machineName: string;
  readonly spaceId: string;
}>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PostMachineBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'machineId',
      'machineName',
      'spaceId'
    ],
    properties: {
      machineId: {
        type: 'string'
      },
      machineName: {
        type: 'string'
      },
      spaceId: {
        type: 'string'
      }
    }
  }
};

@injectableConstructor({
  machineService: MachineService
})
@singleton()
export class MachineController {
  private readonly _machineService: MachineService;

  public constructor(deps: {
    machineService: MachineService;
  }) {
    ({
      machineService: this._machineService
    } = deps);
  }
}
