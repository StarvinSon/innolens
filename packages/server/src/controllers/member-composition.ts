import { NOT_IMPLEMENTED } from 'http-status-codes';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';
import { Middleware } from '../middlewares';
import { MemberCompositionService, MemberCompositionPerspective } from '../services/member-composition';

import { UserAuthenticator } from './utils/user-authenticator';
import { Context } from './context';
import { Validator, createValidator } from './utils/validator';
import { parseBody } from './utils/body-parser';


export interface MemberCompositionController {
  get: Middleware;
  post: Middleware;
}


interface PostBody {
  readonly time: string;
  readonly perspectives: ReadonlyArray<MemberCompositionPerspective>;
}

const postBodyValidator: Validator<PostBody> = createValidator({
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
});

export class MemberCompositionControllerImpl implements MemberCompositionController {
  private readonly _memberCompositionService: MemberCompositionService;
  private readonly _userAuthenticator: UserAuthenticator;

  public constructor(options: {
    memberCompositionService: MemberCompositionService,
    userAuthenticator: UserAuthenticator
  }) {
    ({
      memberCompositionService: this._memberCompositionService,
      userAuthenticator: this._userAuthenticator
    } = options);
  }

  public async get(ctx: Context): Promise<void> {
    await this._userAuthenticator(ctx);
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

  public async post(ctx: Context): Promise<void> {
    await this._userAuthenticator(ctx);
    const body = await parseBody(ctx);
    postBodyValidator.assert(body);

    await this._memberCompositionService.insertOne({
      ...body,
      time: new Date(body.time)
    });
    ctx.body = null;
  }
}


export const MemberCompositionController =
  createToken<Promise<MemberCompositionController>>(__filename, 'MemberCompositionController');

export const registerMemberCompositionController = createAsyncSingletonRegistrant(
  MemberCompositionController,
  {
    memberCompositionService: MemberCompositionService,
    userAuthenticator: UserAuthenticator
  },
  (opts) => new MemberCompositionControllerImpl(opts)
);
