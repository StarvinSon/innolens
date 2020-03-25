import { promises as fsPromises } from 'fs';

import * as Api from '@innolens/api/node';
import { singleton, injectableConstructor } from '@innolens/resolver';
import { BadRequest } from 'http-errors';
import { CREATED } from 'http-status-codes';

import { MembersService } from '../services/members';

import { Context } from './context';
import { InjectedBodyParserFactory } from './utils/body-parser';
import { parseFormDataBody, getFormDataBody } from './utils/form-data-body-parser';
import { validateResponseBody } from './utils/response-body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


@injectableConstructor({
  memberService: MembersService,
  userAuthenticator: UserAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory
})
@singleton()
export class MembersController {
  private readonly _membersService: MembersService;

  public constructor(deps: {
    memberService: MembersService;
    userAuthenticator: UserAuthenticator;
    injectedBodyParserFactory: InjectedBodyParserFactory
  }) {
    ({
      memberService: this._membersService
    } = deps);
    initializeAuthenticateUser(MembersController, this, deps.userAuthenticator);
  }

  @authenticateUser()
  @validateResponseBody(Api.Members.GetCountHistory.Response)
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

    const history = await this._membersService.getHistory(category, range);
    ctx.body = Api.Members.GetCountHistory.stringifyResponse(history);
  }

  @authenticateUser()
  @parseFormDataBody()
  public async postImport(ctx: Context): Promise<void> {
    const body = getFormDataBody(ctx);
    const csvFile = body.file?.[0];
    if (csvFile === undefined || typeof csvFile === 'string') {
      throw new BadRequest('Require field "file"');
    }

    await this._membersService.importFromFile(csvFile.path);
    await fsPromises.unlink(csvFile.path);
    ctx.status = CREATED;
  }
}
