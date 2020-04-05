import * as Api from '@innolens/api/node';
import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { CREATED } from 'http-status-codes';

import { ClientService } from '../services/client';
import { FileService } from '../services/file';
import { OAuth2Service } from '../services/oauth2';
import { UserService } from '../services/user';

import { Context } from './context';
import { validateResponseBody } from './utils/response-body-validator';
import {
  authenticateUser, useAuthenticateUser, useAuthenticateUser$clientServiceSym,
  useAuthenticateUser$oauth2ServiceSym, useAuthenticateUser$userServiceSym, getOAuth2Token
} from './utils/user-authenticator';


@injectableConstructor({
  fileService: FileService,
  clientService: ClientService,
  oauth2Service: OAuth2Service,
  userService: UserService
})
@singleton()
export class FileController extends useAuthenticateUser(Object) {
  private readonly _fileService: FileService;
  protected readonly [useAuthenticateUser$clientServiceSym]: ClientService;
  protected readonly [useAuthenticateUser$oauth2ServiceSym]: OAuth2Service;
  protected readonly [useAuthenticateUser$userServiceSym]: UserService;

  public constructor(deps: {
    readonly fileService: FileService,
    readonly clientService: ClientService,
    readonly oauth2Service: OAuth2Service,
    readonly userService: UserService
  }) {
    super();
    ({
      fileService: this._fileService,
      clientService: this[useAuthenticateUser$clientServiceSym],
      oauth2Service: this[useAuthenticateUser$oauth2ServiceSym],
      userService: this[useAuthenticateUser$userServiceSym]
    } = deps);
  }

  @authenticateUser()
  @validateResponseBody(Api.Files.PostFile.responseBodyJsonSchema)
  public async postFile(ctx: Context): Promise<void> {
    const token = getOAuth2Token(ctx);
    const id = await this._fileService.saveFile(token.accessToken, ctx.req);
    ctx.status = CREATED;
    ctx.body = Api.Files.PostFile.toResponseBody({
      data: {
        id
      }
    });
  }
}
