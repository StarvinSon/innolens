import { DependencyContainer, container as rootContainer, instanceCachingFactory } from 'tsyringe';

import { registerApp } from './app';
import {
  AppContext, DependencyCreator, ResolveAllResult,
  ResolveAllAsyncResult, Token,
  TokenOrCreator, DependencyRegistrant
} from './app-context';
import { registerControllers } from './controllers';
import { registerDbAndCollections } from './db';
import { registerLogger } from './log';
import { registerServices } from './services';


export interface AppContextOptions {
  readonly staticRoot: string;
  readonly dbConnectionUri: string;
}

class AppContextImpl implements AppContext {
  private readonly _dependencyContainer: DependencyContainer = rootContainer.createChildContainer();

  public constructor(options: AppContextOptions) {
    const registrants: ReadonlyArray<DependencyRegistrant> = [
      registerLogger,
      (c) => registerDbAndCollections(c, { connectionUri: options.dbConnectionUri }),
      registerServices,
      (c) => registerControllers(c, { staticRoot: options.staticRoot }),
      registerApp
    ];
    registrants.forEach((register) => {
      register(this);
    });
  }

  public resolve<T>(token: TokenOrCreator<T>): T {
    const { _dependencyContainer: container } = this;
    if (typeof token === 'function') {
      return token(this);
    }
    return container.resolve(token as symbol);
  }

  // eslint-disable-next-line max-len
  public resolveAll<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): ResolveAllResult<T> {
    return tokens.map((t) => this.resolve(t)) as any;
  }

  // eslint-disable-next-line max-len
  public async resolveAllAsync<T extends ReadonlyArray<TokenOrCreator<any>>>(...tokens: T): ResolveAllAsyncResult<T> {
    return Promise.all(this.resolveAll(...tokens)) as any;
  }

  public registerSingleton<T>(token: Token<T>, creator: DependencyCreator<T>): void {
    const { _dependencyContainer: container } = this;
    container.register(token as symbol, {
      useFactory: instanceCachingFactory(() => creator(this))
    });
  }
}

export const createAppContext = (options: AppContextOptions): AppContext =>
  new AppContextImpl(options);
