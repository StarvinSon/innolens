import { createToken, singleton, injectableConstructor } from '@innolens/resolver';

import { MachineUsageService } from '../services/machine-usage';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { Middleware } from './middleware';
import { parseBody, InjectedBodyParserFactory, initializeParseBody } from './utils/body-parser';
import { validateBody, getValidatedBody } from './utils/body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


export interface MachineUsageController {
  get: Middleware;
  post: Middleware;
}

export const MachineUsageController =
  createToken<MachineUsageController>('MachineUsageController');


type PostMachineUsageBody = ReadonlyArray<{
  readonly memberId: string;
  readonly machineId: string;
  readonly startTime: Date;
  readonly endTime: Date;
}>;

const PostMachineUsageBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'memberId',
      'machineId',
      'startTime',
      'endTime'
    ],
    properties: {
      memberId: {
        type: 'string'
      },
      machineId: {
        type: 'string'
      },
      startTime: {
        type: 'date'
      },
      endTime: {
        type: 'date'
      }
    }
  }
};

@injectableConstructor({
  machineUsageService: MachineUsageService,
  userAuthenticator: UserAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory
})
@singleton()
export class MachineUsageControllerImpl implements MachineUsageController {
  private readonly _machineUsageService: MachineUsageService;

  public constructor(deps: {
    machineUsageService: MachineUsageService;
    userAuthenticator: UserAuthenticator;
    injectedBodyParserFactory: InjectedBodyParserFactory
  }) {
    ({
      machineUsageService: this._machineUsageService
    } = deps);
    initializeAuthenticateUser(MachineUsageControllerImpl, this, deps.userAuthenticator);
    initializeParseBody(MachineUsageControllerImpl, this, deps.injectedBodyParserFactory);
  }

  @authenticateUser()
  public async get(ctx: Context): Promise<void> {
    const machineUsageList = await fromAsync(this._machineUsageService.findAll());
    ctx.body = machineUsageList.map((machineUsage) => ({
      memberId: machineUsage.memberId,
      machineId: machineUsage.machineId,
      startTime: machineUsage.startTime.toISOString(),
      endTime: machineUsage.endTime.toISOString()
    }));
  }

  @authenticateUser()
  @parseBody()
  @validateBody(PostMachineUsageBody)
  public async post(ctx: Context): Promise<void> {
    const machineUsageList = getValidatedBody<PostMachineUsageBody>(ctx);
    await this._machineUsageService.insertMany(machineUsageList.map((machineUsage) => ({
      ...machineUsage,
      startTime: new Date(machineUsage.startTime),
      endTime: new Date(machineUsage.endTime)
    })));
    ctx.body = null;
  }
}
