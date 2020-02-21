import {
  createToken, singleton, map,
  injectableConstructor
} from '@innolens/resolver';
import { NOT_FOUND } from 'http-status-codes';
import send from 'koa-send';

import { ServerOptions } from '../server-options';

import { Context } from './context';
import { Middleware } from './middleware';


export interface StaticController {
  /**
   * Expect subpath in ctx.params.subPath.
   * E.g. router.get(':subPath(.*)', staticController.getFile);
   */
  get: Middleware;
}

export const StaticController = createToken<StaticController>('StaticController');


const pagePaths: ReadonlyArray<string> = [
  '/'
];

@injectableConstructor(map(ServerOptions, (serOpts) => serOpts.staticRoot))
@singleton()
export class StaticControllerImpl implements StaticController {
  private readonly _root: string;

  public constructor(root: string) {
    this._root = root;
  }

  public async get(ctx: Context): Promise<void> {
    let match: RegExpMatchArray | null;
    let path: string;
    if ((match = /^\/static(\/.*)$/.exec(ctx.params.subPath)) !== null) {
      // eslint-disable-next-line prefer-destructuring
      path = match[1];
    } else {
      path = '/index.html';
      if (!pagePaths.includes(ctx.params.subPath)) {
        ctx.status = NOT_FOUND;
      }
    }

    try {
      await send(ctx, path, {
        root: this._root
      });
    } catch (err) {
      if (err.status !== NOT_FOUND) {
        throw err;
      }
    }
  }
}
