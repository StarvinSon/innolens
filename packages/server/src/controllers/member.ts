import { createToken, createAsyncSingletonRegistrant } from '../resolver';
import { Middleware } from '../middlewares';
import { MemberService } from '../services/member';
import { fromAsync } from '../utils/array';

import { UserAuthenticator } from './utils/user-authenticator';
import { Context } from './context';
import { createValidator, Validator } from './utils/validator';
import { parseBody } from './utils/body-parser';


export interface MemberController {
  get: Middleware;
  post: Middleware;
}


interface MemberCreateData {
  readonly name: string;
  readonly department: string;
  readonly typeOfStudy: string;
  readonly yearOfStudy: string;
  readonly studyProgramme: string;
  readonly affiliatedStudentInterestGroup: string;
}

const postBodyValidator: Validator<ReadonlyArray<MemberCreateData>> = createValidator({
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'name',
      'department',
      'typeOfStudy',
      'yearOfStudy',
      'studyProgramme',
      'affiliatedStudentInterestGroup'
    ],
    properties: {
      name: {
        type: 'string'
      },
      department: {
        type: 'string'
      },
      typeOfStudy: {
        type: 'string'
      },
      yearOfStudy: {
        type: 'string'
      },
      studyProgramme: {
        type: 'string'
      },
      affiliatedStudentInterestGroup: {
        type: 'string'
      }
    }
  }
});


export class MemberControllerImpl implements MemberController {
  private readonly _memberService: MemberService;
  private readonly _userAuthenticator: UserAuthenticator;

  public constructor(options: {
    memberService: MemberService;
    userAuthenticator: UserAuthenticator;
  }) {
    ({
      memberService: this._memberService,
      userAuthenticator: this._userAuthenticator
    } = options);
  }

  public async get(ctx: Context): Promise<void> {
    await this._userAuthenticator(ctx);
    ctx.body = await fromAsync(this._memberService.findAll());
  }

  public async post(ctx: Context): Promise<void> {
    await this._userAuthenticator(ctx);
    const members = await parseBody(ctx);
    postBodyValidator.assert(members);

    await this._memberService.insertMany(members);
    ctx.body = null;
  }
}


export const MemberController =
  createToken<Promise<MemberController>>(__filename, 'MemberController');

export const registerMemberController = createAsyncSingletonRegistrant(
  MemberController,
  {
    memberService: MemberService,
    userAuthenticator: UserAuthenticator
  },
  (opts) => new MemberControllerImpl(opts)
);
