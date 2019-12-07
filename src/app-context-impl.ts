import {
  DependencyContainer, container as rootContainer, InjectionToken,
  instanceCachingFactory
} from 'tsyringe';

import {
  AppContext, DependencyCreator, ResolveAllResult,
  ResolveAllAsyncResult
} from './app-context';
import { registerDbAndCollections } from './db';
import { registerServices } from './services';
import { registerControllers } from './controllers';
import { registerLogger } from './log';
import { registerApp } from './app';


class AppContextImpl implements AppContext {
  private readonly _dependencyContainer: DependencyContainer = rootContainer.createChildContainer();

  public resolve<T>(token: InjectionToken<T>): T {
    const { _dependencyContainer: container } = this;
    return container.resolve(token);
  }

  // eslint-disable-next-line max-len
  public resolveAll<T extends ReadonlyArray<InjectionToken<any>>>(...tokens: T): ResolveAllResult<T> {
    return tokens.map((t) => this.resolve(t)) as any;
  }

  // eslint-disable-next-line max-len
  public async resolveAllAsync<T extends ReadonlyArray<InjectionToken<any>>>(...tokens: T): ResolveAllAsyncResult<T> {
    return Promise.all(this.resolveAll(...tokens)) as any;
  }

  public registerSingleton<T>(token: InjectionToken<T>, creator: DependencyCreator<T>): void {
    const { _dependencyContainer: container } = this;
    container.register(token, {
      useFactory: instanceCachingFactory(() => creator(this))
    });
  }
}

export interface AppContextOptions {
  readonly staticRoot: string;
  readonly dbConnectionUri: string;
}

export const createAppContext = (options: AppContextOptions): AppContext => {
  const appCtx = new AppContextImpl();

  registerLogger(appCtx);
  registerDbAndCollections(appCtx, {
    connectionUri: options.dbConnectionUri
  });
  registerServices(appCtx);
  registerControllers(appCtx, {
    staticRoot: options.staticRoot
  });
  registerApp(appCtx);

  return appCtx;
};
