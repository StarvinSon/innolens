import { createToken, singleton, injectableConstructor } from '@innolens/resolver';

import { MachineService } from '../services/machine';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { Middleware } from './middleware';
import { parseBody, InjectedBodyParserFactory, initializeParseBody } from './utils/body-parser';
import { validateBody, getValidatedBody } from './utils/body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


export interface MachineController {
  get: Middleware;
  post: Middleware;
}

export const MachineController =
  createToken<MachineController>('MachineController');


type PostMachineBody = ReadonlyArray<{
  readonly machineId: string;
  readonly machineName: string;
  readonly spaceId: string;
}>;

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
  machineService: MachineService,
  userAuthenticator: UserAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory
})
@singleton()
export class MachineControllerImpl implements MachineController {
  private readonly _machineService: MachineService;

  public constructor(deps: {
    machineService: MachineService;
    userAuthenticator: UserAuthenticator;
    injectedBodyParserFactory: InjectedBodyParserFactory
  }) {
    ({
      machineService: this._machineService
    } = deps);
    initializeAuthenticateUser(MachineControllerImpl, this, deps.userAuthenticator);
    initializeParseBody(MachineControllerImpl, this, deps.injectedBodyParserFactory);
  }

  @authenticateUser()
  public async get(ctx: Context): Promise<void> {
    const machines = await fromAsync(this._machineService.findAll());
    ctx.body = machines.map((machine) => ({
      machineId: machine.machineId,
      machineName: machine.machineName,
      spaceId: machine.spaceId
    }));
  }

  @authenticateUser()
  @parseBody()
  @validateBody(PostMachineBody)
  public async post(ctx: Context): Promise<void> {
    const machines = getValidatedBody<PostMachineBody>(ctx);
    await this._machineService.insertMany(machines);
    ctx.body = null;
  }
}
