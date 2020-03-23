import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import { NOT_IMPLEMENTED } from 'http-status-codes';

import { MemberCompositionService, MemberCompositionPerspective } from '../services/member-composition';

import { Context } from './context';
import { Middleware } from './middleware';
import { parseBody, InjectedBodyParserFactory, initializeParseBody } from './utils/body-parser';
import { getValidatedRequestBody, validateRequestBody } from './utils/request-body-validator';
import { UserAuthenticator, authenticateUser, initializeAuthenticateUser } from './utils/user-authenticator';


export interface MemberCompositionController {
  get: Middleware;
  post: Middleware;
}

export const MemberCompositionController =
  createToken<MemberCompositionController>('MemberCompositionController');


interface PostBody {
  readonly time: string;
  readonly perspectives: ReadonlyArray<MemberCompositionPerspective>;
}

const PostBody: object = {
  type: 'object',
  required: [
    'time',
    'perspectives'
  ],
  additionalProperties: false,
  properties: {
    time: {
      type: 'string'
    },
    perspectives: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'type',
          'groups'
        ],
        properties: {
          type: {
            type: 'string'
          },
          groups: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'type',
                'count'
              ],
              properties: {
                type: {
                  type: 'string'
                },
                count: {
                  type: 'integer'
                }
              }
            }
          }
        }
      }
    }
  }
};


@injectableConstructor({
  memberCompositionService: MemberCompositionService,
  userAuthenticator: UserAuthenticator,
  injectedBodyParserFactory: InjectedBodyParserFactory
})
@singleton()
export class MemberCompositionControllerImpl implements MemberCompositionController {
  private readonly _memberCompositionService: MemberCompositionService;

  public constructor(deps: {
    memberCompositionService: MemberCompositionService,
    userAuthenticator: UserAuthenticator,
    injectedBodyParserFactory: InjectedBodyParserFactory
  }) {
    ({
      memberCompositionService: this._memberCompositionService
    } = deps);
    initializeAuthenticateUser(MemberCompositionControllerImpl, this, deps.userAuthenticator);
    initializeParseBody(MemberCompositionControllerImpl, this, deps.injectedBodyParserFactory);
  }

  @authenticateUser()
  public async get(ctx: Context): Promise<void> {
    if (ctx.query.latest !== undefined) {
      await this._getLatest(ctx);
    } else {
      ctx.status = NOT_IMPLEMENTED;
    }
  }

  private async _getLatest(ctx: Context): Promise<void> {
    const composition = await this._memberCompositionService.findLatest();
    const result = {
      data: composition === null ? null : {
        time: composition.time,
        perspectives: composition.perspectives
      }
    };
    ctx.body = result;
  }

  @authenticateUser()
  @parseBody()
  @validateRequestBody(PostBody)
  public async post(ctx: Context): Promise<void> {
    const body = getValidatedRequestBody<PostBody>(ctx);
    await this._memberCompositionService.insertOne({
      ...body,
      time: new Date(body.time)
    });
    ctx.body = null;
  }
}
