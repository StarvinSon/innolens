import { createLogger, format, transports } from 'winston';
import yargs, { Argv } from 'yargs';

import { createApp, AppOptions } from './app';


interface ServeOptions extends Omit<AppOptions, 'logger'> {
  readonly port: number;
}

const serve = async (options: ServeOptions): Promise<void> => {
  const { port, staticRoot, dbConnectionUri } = options;

  const logger = createLogger({
    format: format.combine(
      format.timestamp(),
      format.splat(),
      format.colorize(),
      format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
    ),
    transports: [
      new transports.Console({
        handleExceptions: true
      }),
      new transports.File({
        filename: 'app.log',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 3,
        tailable: true,
        handleExceptions: true,
        format: format.uncolorize()
      })
    ]
  });
  logger.info('Starting server using options: %O', options);

  const app = await createApp({
    logger,
    staticRoot,
    dbConnectionUri
  });

  const server = app.listen(port, () => {
    logger.info('Server is listening: %O', server.address());
  });
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
