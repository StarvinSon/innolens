import yargs from 'yargs';

import { App, registerApp } from './app';
import { Logger, registerLogger } from './logger';
import { ServerOptions } from './server-options';
import { createResolver } from './resolver';
import { registerControllers } from './controllers';
import { registerDbAndCollections } from './db';
import { registerRoutes } from './routes';
import { registerServices } from './services';


const start = (options: ServerOptions): void => {
  Promise.resolve()
    .then(async () => {
      const resolver = createResolver();
      registerControllers(resolver);
      registerDbAndCollections(resolver);
      registerRoutes(resolver);
      registerServices(resolver);
      registerApp(resolver);
      registerLogger(resolver);
      resolver.registerSingleton(ServerOptions, () => options);

      const logger = resolver.resolve(Logger);
      logger.info('Starting server using options: %O', options);

      const app = await resolver.resolve(App);

      const server = app.listen(options.port, () => {
        logger.info('Server is listening: %O', server.address());
      });
    })
    .catch((err) => {
      console.error(err);
      process.exit(process.exitCode ?? 1);
    });
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
      (argv) => start({
        port: argv.port,
        staticRoot: argv.staticRoot,
        dbConnectionUri: argv.dbConnectionUri
      })
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
