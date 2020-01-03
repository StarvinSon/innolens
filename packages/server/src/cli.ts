import 'reflect-metadata';

import yargs, { Argv } from 'yargs';

import { App } from './app';
import { createAppContext } from './app-context-impl';
import { Logger } from './log';


interface ServeOptions {
  readonly port: number;
  readonly staticRoot: string;
  readonly dbConnectionUri: string;
}

const serve = async (options: ServeOptions): Promise<void> => {
  try {
    const appCtx = createAppContext({
      staticRoot: options.staticRoot,
      dbConnectionUri: options.dbConnectionUri
    });

    const logger = appCtx.resolve(Logger);
    logger.info('Starting server using options: %O', options);

    const app = await appCtx.resolve(App);

    const server = app.listen(options.port, () => {
      logger.info('Server is listening: %O', server.address());
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};


const createParser = (): Argv<{}> => yargs
  .command(
    '$0',
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
    (argv) => serve({
      port: argv.port,
      staticRoot: argv.staticRoot,
      dbConnectionUri: argv.dbConnectionUri
    })
  )
  .alias({
    /* eslint-disable quote-props */
    'v': 'version',
    'h': 'help'
    /* eslint-enable quote-props */
  })
  .strict(true)
  .locale('en');

if (require.main === module) {
  createParser().parse();
}
