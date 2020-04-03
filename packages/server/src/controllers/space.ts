import * as Api from '@innolens/api/node';
import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { CREATED } from 'http-status-codes';

import { Logger } from '../logger';
import { ClientService } from '../services/client';
import { OAuth2Service } from '../services/oauth2';
import { SpaceService } from '../services/space';
import { UserService } from '../services/user';

import { Context } from './context';
import { getRequestBody } from './utils/request-body';
import { parseRequestBodyCsv } from './utils/request-body-csv-parser';
import { useParseRequestBody, useParseRequestBody$loggerSym, parseRequestBody } from './utils/request-body-parser';
import { validateRequestBody } from './utils/request-body-validator';
import { validateResponseBody } from './utils/response-body-validator';
import {
  authenticateUser, useAuthenticateUser, useAuthenticateUser$oauth2ServiceSym,
  useAuthenticateUser$userServiceSym, useAuthenticateUser$clientServiceSym
} from './utils/user-authenticator';


@injectableConstructor({
  spaceService: SpaceService,
  oauth2Service: OAuth2Service,
  userService: UserService,
  clientService: ClientService,
  logger: Logger
})
@singleton()
export class SpaceController extends useParseRequestBody(useAuthenticateUser(Object)) {
  private readonly _spaceService: SpaceService;

  protected readonly [useAuthenticateUser$oauth2ServiceSym]: OAuth2Service;
  protected readonly [useAuthenticateUser$userServiceSym]: UserService;
  protected readonly [useAuthenticateUser$clientServiceSym]: ClientService;
  protected readonly [useParseRequestBody$loggerSym]: Logger;

  public constructor(deps: {
    spaceService: SpaceService;
    oauth2Service: OAuth2Service;
    userService: UserService;
    clientService: ClientService;
    logger: Logger;
  }) {
    super();
    ({
      spaceService: this._spaceService,
      oauth2Service: this[useAuthenticateUser$oauth2ServiceSym],
      userService: this[useAuthenticateUser$userServiceSym],
      clientService: this[useAuthenticateUser$clientServiceSym],
      logger: this[useParseRequestBody$loggerSym]
    } = deps);
  }

  @authenticateUser()
  @parseRequestBody('multipart/form-data')
  @parseRequestBodyCsv('file')
  @validateRequestBody(Api.Spaces.PostSpaces.requestBodySchema)
  public async postSpaces(ctx: Context): Promise<void> {
    const { file } = Api.Spaces.PostSpaces.fromRequestBodyJson(getRequestBody(ctx));
    await this._spaceService.importSpaces(file.map((record) => ({
      spaceId: record.space_id,
      spaceName: record.space_name
    })));
    ctx.status = CREATED;
  }

  @authenticateUser()
  @validateResponseBody(Api.Spaces.GetSpaces.responseBodySchema)
  public async getSpaces(ctx: Context): Promise<void> {
    const spaces = await this._spaceService.getSpaces();
    ctx.body = Api.Spaces.GetSpaces.toResponseBodyJson({
      data: spaces.map((space) => ({
        spaceId: space.spaceId,
        spaceName: space.spaceName
      }))
    });
  }
}
