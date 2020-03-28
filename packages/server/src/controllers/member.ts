import * as Api from '@innolens/api/node';
import { singleton, injectableConstructor } from '@innolens/resolver';
import { BadRequest } from 'http-errors';
import { CREATED } from 'http-status-codes';

import { Logger } from '../logger';
import { ClientService } from '../services/client';
import { MemberService } from '../services/member';
import { OAuth2Service } from '../services/oauth2';
import { UserService } from '../services/user';


import { Context } from './context';
import { getRequestBody } from './utils/request-body';
import { parseRequestBodyCsv } from './utils/request-body-csv-parser';
import {
  parseRequestBody, useParseRequestBody, useParseRequestBody$loggerSym
} from './utils/request-body-parser';
import { validateRequestBody } from './utils/request-body-validator';
import { validateResponseBody } from './utils/response-body-validator';
import {
  authenticateUser, useAuthenticateUser, useAuthenticateUser$oauth2ServiceSym,
  useAuthenticateUser$userServiceSym, useAuthenticateUser$clientServiceSym
} from './utils/user-authenticator';


@injectableConstructor({
  memberService: MemberService,
  oauth2Service: OAuth2Service,
  userService: UserService,
  clientService: ClientService,
  logger: Logger
})
@singleton()
export class MemberController extends useParseRequestBody(useAuthenticateUser(Object)) {
  private readonly _memberService: MemberService;

  protected readonly [useAuthenticateUser$oauth2ServiceSym]: OAuth2Service;
  protected readonly [useAuthenticateUser$userServiceSym]: UserService;
  protected readonly [useAuthenticateUser$clientServiceSym]: ClientService;
  protected readonly [useParseRequestBody$loggerSym]: Logger;

  public constructor(deps: {
    memberService: MemberService;
    oauth2Service: OAuth2Service;
    userService: UserService;
    clientService: ClientService;
    logger: Logger;
  }) {
    super();
    ({
      memberService: this._memberService,
      oauth2Service: this[useAuthenticateUser$oauth2ServiceSym],
      userService: this[useAuthenticateUser$userServiceSym],
      clientService: this[useAuthenticateUser$clientServiceSym],
      logger: this[useParseRequestBody$loggerSym]
    } = deps);
  }

  @authenticateUser()
  @validateResponseBody(Api.Members.GetCountHistory.responseJsonSchema)
  public async getCountHistory(ctx: Context): Promise<void> {
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
    ctx.body = Api.Members.GetCountHistory.toResponseJson(history);
  }

  @authenticateUser()
  @parseRequestBody('multipart/form-data')
  @parseRequestBodyCsv('file')
  @validateRequestBody(Api.Members.PostMembers.requestJsonSchema)
  public async postMembers(ctx: Context): Promise<void> {
    const { file } = Api.Members.PostMembers.fromRequestJson(getRequestBody(ctx));
    await this._memberService.import(file.map((record) => ({
      memberId: record.member_id,
      name: record.name,
      department: record.department,
      typeOfStudy: record.type_of_study,
      studyProgramme: record.study_programme,
      yearOfStudy: record.year_of_study,
      affiliatedStudentInterestGroup: record.affiliated_student_interest_group,
      membershipStartTime: new Date(record.membership_start_time),
      membershipEndTime: new Date(record.membership_end_time)
    })));
    ctx.status = CREATED;
  }
}
