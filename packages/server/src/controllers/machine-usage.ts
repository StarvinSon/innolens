import { createToken, singleton, injectableConstructor } from '@innolens/resolver';

import { MachineUsageService } from '../services/machine-usage';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { Middleware } from './middleware';
import { parseBody, InjectedBodyParserFactory, initializeParseBody } from './utils/body-parser';
import { validateRequestBody, getValidatedRequestBody } from './utils/request-body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


export interface MachineUsageController {
  get: Middleware;
  post: Middleware;
}

export const MachineUsageController =
  createToken<MachineUsageController>('MachineUsageController');


type PostMachineUsageBody = ReadonlyArray<{
  readonly machineId: string;
  readonly memberId: string;
  readonly time: Date;
  readonly action: string;
}>;

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
      machineId: machineUsage.machineId,
      memberId: machineUsage.memberId,
      time: machineUsage.time.toISOString(),
      action: machineUsage.action
    }));
  }

  @authenticateUser()
  @parseBody()
  @validateRequestBody(PostMachineUsageBody)
  public async post(ctx: Context): Promise<void> {
    const machineUsageList = getValidatedRequestBody<PostMachineUsageBody>(ctx);
    await this._machineUsageService
      .insertMany(machineUsageList.map((machineUsage) => ({
        ...machineUsage,
        time: new Date(machineUsage.time)
      })));
    ctx.body = null;
  }
}
