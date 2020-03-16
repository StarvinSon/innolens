import 'reflect-metadata';
import {
  createResolver, Token, FactoryOrConstructor,
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver';
import { ObjectId } from 'mongodb';
import yargs from 'yargs';

import { App, createApp } from './app';
import { controllerCreators } from './controllers';
import { dbCreators } from './db';
import { Logger, createLogger } from './logger';
import { ServerOptions } from './server-options';
import { serviceCreators } from './services';
import { ClientService, ClientType } from './services/client';
import { UserService } from './services/user';
import { utilCreators } from './utils';


const getCreators = (
  serverOptions: ServerOptions
): ReadonlyArray<readonly [Token<unknown>, FactoryOrConstructor<unknown>]> => [
  ...controllerCreators,
  ...dbCreators,
  ...serviceCreators,
  ...utilCreators,
  [App, createApp],
  [Logger, createLogger],
  [ServerOptions, decorate(
    name('createServerOptions'),
    injectableFactory(),
    singleton(),
    () => serverOptions
  )]
];

const start = async (options: ServerOptions): Promise<void> => {
  try {
    const creators = getCreators(options);
    const resolver = createResolver();
    for (const [token, creator] of creators) {
      resolver.register(token, creator);
    }

    // Uncomment to test all dependencies:
    // for (const [token] of creators) {
    //   // eslint-disable-next-line no-await-in-loop
    //   await resolver.resolve(token);
    // }

    const [clientService, userService, app, logger] =
      await resolver.resolve([ClientService, UserService, App, Logger] as const);

    const defaultClient = await clientService.findByPublicId('default');
    if (defaultClient === null) {
      await clientService.insert({
        _id: new ObjectId(),
        name: 'Default Public Client',
        publicId: 'default',
        type: ClientType.PUBLIC,
        secret: ''
      });
    }

    const rootUser = await userService.findByUsername('root');
    if (rootUser === null) {
      await userService.insert({
        _id: new ObjectId(),
        username: 'root',
        password: 'innoroot',
        name: 'Root Administrator'
      });
    }

    logger.info('Starting server using options: %O', options);
    const server = app.listen(options.port, () => {
      logger.info('Server is listening: %O', server.address());
    });

  } catch (err) {
    console.error(err);
    process.exit(process.exitCode ?? 1);
  }
};


const main = (): void => {
  yargs
    .command(
      'start',
      'start a server',
      /* eslint-disable-next-line no-shadow */
      (yargs) => yargs
        .options({
          port: {
            type: 'number',
            requiresArg: true,
            default: 3000
          },
          staticRoot: {
            type: 'string',
            requiresArg: true,
            normalize: true,
            default: 'public'
          },
          dbConnectionUri: {
            type: 'string',
            requiresArg: true,
            default: 'mongodb://localhost:27017/innolens',
            description: 'The MongoDB connection string URI, must contains db name'
          }
        })
        .config(),
      (argv) => Promise.resolve().then(() => start({
        port: argv.port,
        staticRoot: argv.staticRoot,
        dbConnectionUri: argv.dbConnectionUri
      }))
    )
    .demandCommand(1)
    .alias({
      help: 'h',
      version: 'v'
    })
    .strict(true)
    .locale('en')
    .parse();
};

if (require.main === module) {
  main();
}
