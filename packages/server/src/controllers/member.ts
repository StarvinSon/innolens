import { createToken, singleton, injectableConstructor } from '@innolens/resolver';

import { MemberService } from '../services/member';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { Middleware } from './middleware';
import { parseBody, InjectedBodyParserFactory, initializeParseBody } from './utils/body-parser';
import { validateBody, getValidatedBody } from './utils/body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


export interface MemberController {
  get: Middleware;
  post: Middleware;
}

export const MemberController =
  createToken<MemberController>('MemberController');


type PostMemberBody = ReadonlyArray<{
  readonly uid: string;
  readonly name: string;
  readonly department: string;
  readonly typeOfStudy: string;
  readonly yearOfStudy: string;
  readonly studyProgramme: string;
  readonly affiliatedStudentInterestGroup: string;
  readonly registrationTime: string;
}>;

const PostMemberBody: object = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: [
      'uid',
      'name',
      'department',
      'typeOfStudy',
      'yearOfStudy',
      'studyProgramme',
      'affiliatedStudentInterestGroup',
      'registrationTime'
    ],
    properties: {
      uid: {
        type: 'string'
      },
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
      },
      registrationTime: {
        type: 'string'
      }
    }
  }
};

@injectableConstructor({
  memberService: MemberService,
  userAuthenticator: UserAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory
})
@singleton()
export class MemberControllerImpl implements MemberController {
  private readonly _memberService: MemberService;

  public constructor(deps: {
    memberService: MemberService;
    userAuthenticator: UserAuthenticator;
    injectedBodyParserFactory: InjectedBodyParserFactory
  }) {
    ({
      memberService: this._memberService
    } = deps);
    initializeAuthenticateUser(MemberControllerImpl, this, deps.userAuthenticator);
    initializeParseBody(MemberControllerImpl, this, deps.injectedBodyParserFactory);
  }

  @authenticateUser()
  public async get(ctx: Context): Promise<void> {
    const members = await fromAsync(this._memberService.findAll());
    ctx.body = members.map((member) => ({
      uid: member.uid,
      name: member.name,
      department: member.department,
      typeOfStudy: member.typeOfStudy,
      yearOfStudy: member.yearOfStudy,
      studyProgramme: member.studyProgramme,
      affiliatedStudentInterestGroup: member.affiliatedStudentInterestGroup,
      registrationTime: member.registrationTime.toISOString()
    }));
  }

  @authenticateUser()
  @parseBody()
  @validateBody(PostMemberBody)
  public async post(ctx: Context): Promise<void> {
    const members = getValidatedBody<PostMemberBody>(ctx);
    await this._memberService.insertMany(members.map((member) => ({
      ...member,
      registrationTime: new Date(member.registrationTime)
    })));
    ctx.body = null;
  }
}
