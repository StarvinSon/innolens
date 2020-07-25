import { resolve } from 'path';
import { promisify } from 'util';

import 'reflect-metadata';
import {
  createResolver, decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver/lib-node';
import { ObjectId } from 'mongodb';
import yargs from 'yargs';

import { App } from './app';
import { DbClient } from './db/db-client';
import { Logger } from './logger';
import { ServerOptions, ModelUri, UploadDirPath } from './server-options';
import { ClientService, ClientType } from './services/client';
import { UserService } from './services/user';


const start = async (options: ServerOptions): Promise<void> => {
  try {
    const resolver = createResolver();
    resolver.register(ServerOptions, decorate(
      name('createServerOptions'),
      injectableFactory(),
      singleton(),
      () => options
    ));
    resolver.register(ModelUri, decorate(
      name('getModelsUri'),
      injectableFactory(),
      singleton(),
      () => options.modelsUri
    ));
    resolver.register(UploadDirPath, decorate(
      name('getUploadDirPath'),
      injectableFactory(),
      singleton(),
      () => options.uploadDirPath
    ));

    const [dbClient, clientService, userService, app, logger] =
      await resolver.resolve([DbClient, ClientService, UserService, App, Logger] as const);

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

    const close = async (signal: NodeJS.Signals): Promise<void> => {
      logger.info(`Received ${signal}`);

      logger.info('Closing server');
      try {
        await promisify(server.close).call(server);
        logger.info('Server closed');
      } catch (err) {
        logger.error('Error during closing server, %O', err);
      }

      logger.info('Closing DB Client');
      try {
        await dbClient.close();
        logger.info('DB Client closed');
      } catch (err) {
        logger.error('Error during closing DB Client, %O', err);
      }
    };
    process.on('SIGTERM', close);
    process.on('SIGINT', close);

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
          dbConnectionUri: {
            type: 'string',
            requiresArg: true,
            default: 'mongodb://db:27017/innolens',
            description: 'The MongoDB connection string URI, must contains db name'
          },
          modelsUri: {
            type: 'string',
            requiresArg: true,
            default: 'http://localhost:5000',
            description: 'The models server URI'
          },
          port: {
            type: 'number',
            requiresArg: true,
            default: 3000
          },
          staticRoot: {
            type: 'string',
            requiresArg: true,
            normalize: true,
            default: resolve(__dirname, '../../dashboard/out')
          },
          uploadDir: {
            type: 'string',
            requiresArg: true,
            normalize: true,
            default: resolve(__dirname, '../uploads'),
            description: 'The path to the directory storing the upload files'
          }
        })
        .config(),
      (argv) => Promise.resolve().then(() => start({
        dbConnectionUri: argv.dbConnectionUri,
        modelsUri: argv.modelsUri,
        port: argv.port,
        staticRootPath: argv.staticRoot,
        uploadDirPath: argv.uploadDir
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
