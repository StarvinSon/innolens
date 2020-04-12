import * as Api from '@innolens/api/legacy/node';
import { singleton, injectableConstructor } from '@innolens/resolver/node';
import createHttpError, { BadRequest } from 'http-errors';
import { CREATED, BAD_REQUEST } from 'http-status-codes';

import { Logger } from '../logger';
import { ClientService } from '../services/client';
import { FileService } from '../services/file';
import { OAuth2Service } from '../services/oauth2';
import {
  SpaceService, spaceMemberCountHistoryGroupBys, SpaceNotFoundError,
  SpaceMemberCountHistory
} from '../services/space';
import { UserService } from '../services/user';
import { fromAsync, contains } from '../utils/array';
import { parseInteger } from '../utils/number';

import { Context, RouterContext } from './context';
import { CsvParser } from './utils/csv-parser';
import { FileController } from './utils/file-controller';
import { getRequestBody } from './utils/request-body';
import { useParseRequestBody, useParseRequestBody$loggerSym, parseRequestBody } from './utils/request-body-parser';
import { validateRequestBody } from './utils/request-body-validator';
import { validateResponseBody } from './utils/response-body-validator';
import {
  authenticateUser, useAuthenticateUser, useAuthenticateUser$oauth2ServiceSym,
  useAuthenticateUser$userServiceSym, useAuthenticateUser$clientServiceSym, getOAuth2Token
} from './utils/user-authenticator';


@injectableConstructor({
  spaceService: SpaceService,
  oauth2Service: OAuth2Service,
  userService: UserService,
  clientService: ClientService,
  fileService: FileService,
  logger: Logger
})
@singleton()
// eslint-disable-next-line max-len
export class SpaceController extends FileController(useParseRequestBody(useAuthenticateUser(Object))) {
  private readonly _spaceService: SpaceService;

  protected readonly [useAuthenticateUser$oauth2ServiceSym]: OAuth2Service;
  protected readonly [useAuthenticateUser$userServiceSym]: UserService;
  protected readonly [useAuthenticateUser$clientServiceSym]: ClientService;
  protected readonly [useParseRequestBody$loggerSym]: Logger;

  protected readonly [FileController.fileService]: FileService;

  /* eslint-disable max-len */
  private readonly _spacesCsvParser = new CsvParser<Api.Spaces.PostSpaces.FileRecordJson>(Api.Spaces.PostSpaces.fileRecordJsonSchema);
  private readonly _spaceAccessRecordsCsvParser = new CsvParser<Api.Spaces.PostSpaceAccessRecords.FileRecordJson>(Api.Spaces.PostSpaceAccessRecords.fileRecordJsonSchema);
  /* eslint-enable max-len */

  public constructor(deps: {
    spaceService: SpaceService;
    oauth2Service: OAuth2Service;
    userService: UserService;
    clientService: ClientService;
    fileService: FileService;
    logger: Logger;
  }) {
    super();
    ({
      spaceService: this._spaceService,
      oauth2Service: this[useAuthenticateUser$oauth2ServiceSym],
      userService: this[useAuthenticateUser$userServiceSym],
      clientService: this[useAuthenticateUser$clientServiceSym],
      fileService: this[FileController.fileService],
      logger: this[useParseRequestBody$loggerSym]
    } = deps);
  }

  @authenticateUser()
  @parseRequestBody()
  @validateRequestBody(Api.Spaces.PostSpaces.requestBodyJsonSchema)
  public async postSpaces(ctx: Context): Promise<void> {
    const body = Api.Spaces.PostSpaces.fromRequestBodyJson(getRequestBody(ctx));

    const token = getOAuth2Token(ctx);
    const fileStream = this.getFile(token.accessToken, body.fileId);
    const records = (await fromAsync(this._spacesCsvParser.parse(fileStream)))
      .map(Api.Spaces.PostSpaces.fromFileRecordJson);

    await this._spaceService.importSpaces(records.map((record) => ({
      spaceId: record.space_id,
      spaceName: record.space_name
    })));
    ctx.status = CREATED;
  }

  @authenticateUser()
  @parseRequestBody()
  @validateRequestBody(Api.Spaces.PostSpaceAccessRecords.requestBodyJsonSchema)
  public async postSpaceAccessRecords(ctx: RouterContext): Promise<void> {
    const { spaceId } = ctx.params as Record<string, string>;
    const body = Api.Spaces.PostSpaceAccessRecords.fromRequestBodyJson(getRequestBody(ctx));

    const token = getOAuth2Token(ctx);
    const fileStream = this.getFile(token.accessToken, body.fileId);
    const records = (await fromAsync(this._spaceAccessRecordsCsvParser.parse(fileStream)))
      .map(Api.Spaces.PostSpaceAccessRecords.fromFileRecordJson);

    try {
      await this._spaceService.importAccessRecords(
        spaceId,
        body.deleteFromTime,
        body.deleteToTime,
        records.map((record) => ({
          time: record.time,
          memberId: record.member_id,
          action: record.action
        }))
      );
    } catch (err) {
      if (err instanceof SpaceNotFoundError) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }

    ctx.status = CREATED;
  }

  @authenticateUser()
  @validateResponseBody(Api.Spaces.GetSpaces.responseBodyJsonSchema)
  public async getSpaces(ctx: Context): Promise<void> {
    const spaces = await this._spaceService.getSpaces();
    ctx.body = Api.Spaces.GetSpaces.toResponseBodyJson({
      data: spaces.map((space) => ({
        spaceId: space.spaceId,
        spaceName: space.spaceName
      }))
    });
  }

  @authenticateUser()
  @validateResponseBody(...Api.Spaces.GetSpaceMemberCountHistory.responseBodyJsonSchema)
  public async getSpaceMemberCountHistory(ctx: RouterContext): Promise<void> {
    const { spaceId } = ctx.params as Record<string, string>;

    const { groupBy, pastHours } = ctx.query as Record<string, string>;
    if (!contains(spaceMemberCountHistoryGroupBys, groupBy)) {
      throw new BadRequest('Invalid query param "groupBy"');
    }
    const pastHoursNum = parseInteger(pastHours, 10);
    if (Number.isNaN(pastHoursNum)) {
      throw new BadRequest('Invalid query param "pastHours"');
    }

    let history: SpaceMemberCountHistory;
    try {
      history = await this._spaceService.getMemberCountHistory(spaceId, groupBy, pastHoursNum);
    } catch (err) {
      if (err instanceof SpaceNotFoundError) {
        throw createHttpError(BAD_REQUEST, err);
      }
      throw err;
    }

    ctx.body = Api.Spaces.GetSpaceMemberCountHistory.toResponseBodyJson({
      data: history
    });
  }
}
