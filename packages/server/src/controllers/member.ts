import { promises as fsPromises } from 'fs';

import { singleton, injectableConstructor } from '@innolens/resolver';
import { BadRequest } from 'http-errors';
import { CREATED } from 'http-status-codes';

import { MemberService } from '../services/member';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { InjectedBodyParserFactory } from './utils/body-parser';
import { parseFormDataBody, getFormDataBody } from './utils/form-data-body-parser';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


@injectableConstructor({
  memberService: MemberService,
  userAuthenticator: UserAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory
})
@singleton()
export class MemberController {
  private readonly _memberService: MemberService;

  public constructor(deps: {
    memberService: MemberService;
    userAuthenticator: UserAuthenticator;
    injectedBodyParserFactory: InjectedBodyParserFactory
  }) {
    ({
      memberService: this._memberService
    } = deps);
    initializeAuthenticateUser(MemberController, this, deps.userAuthenticator);
  }

  @authenticateUser()
  public async get(ctx: Context): Promise<void> {
    const members = await fromAsync(this._memberService.findAll());
    ctx.body = members.map((member) => ({
      memberId: member.memberId,
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
  @parseFormDataBody()
  public async post(ctx: Context): Promise<void> {
    const body = getFormDataBody(ctx);
    const csvFile = body.file?.[0];
    if (csvFile === undefined || typeof csvFile === 'string') {
      throw new BadRequest('Require field "file"');
    }

    await this._memberService.importFromFile(csvFile.path);
    await fsPromises.unlink(csvFile.path);
    ctx.status = CREATED;
  }
}
