import { promises as fsPromises } from 'fs';

import * as Api from '@innolens/api';
import { singleton, injectableConstructor } from '@innolens/resolver';
import { BadRequest } from 'http-errors';
import { CREATED } from 'http-status-codes';

import { MemberService } from '../services/member';
import { fromAsync } from '../utils/array';

import { Context } from './context';
import { InjectedBodyParserFactory } from './utils/body-parser';
import { parseFormDataBody, getFormDataBody } from './utils/form-data-body-parser';
import { validateResponseBody } from './utils/response-body-validator';
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
      registrationStartTime: member.membershipStartTime.toISOString(),
      registrationEndTime: member.membershipEndTime.toISOString()
    }));
  }

  @authenticateUser()
  @validateResponseBody(Api.Member.GetHistory.Response)
  public async getHistory(ctx: Context<Api.Member.GetHistory.Response>): Promise<void> {
    const { category, range } = ctx.query as Record<string, string>;
    if (
      category !== 'department'
      && category !== 'typeOfStudy'
      && category !== 'studyProgramme'
      && category !== 'yearOfStudy'
      && category !== 'affiliatedStudentInterestGroup'
    ) {
      throw new BadRequest('Invalid query param "category"');
    }
    if (
      range !== 'past7Days'
      && range !== 'past30Days'
      && range !== 'past6Months'
      && range !== 'past12Months'
    ) {
      throw new BadRequest('Invalid query param "range"');
    }

    const history = await this._memberService.getHistory(category, range);
    ctx.body = {
      ...history,
      records: history.records.map((record) => ({
        ...record,
        time: record.time.toISOString()
      }))
    };
  }

  @authenticateUser()
  @parseFormDataBody()
  public async postImport(ctx: Context): Promise<void> {
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
