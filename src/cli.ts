import { createLogger, format, transports } from 'winston';
import yargs from 'yargs';

import { createApp } from './app';


interface ServeOptions {
  readonly port: number;
  readonly staticRoot: string;
}

const serve = async (options: ServeOptions) => {
  const { port } = options;

  const logger = createLogger({
    format: format.combine(
      format.timestamp(),
      format.splat()
    ),
    transports: [
      new transports.Console({
        handleExceptions: true,
        format: format.combine(
          format.colorize(),
          format.printf(({ level, message }) => `[${level}] ${message}`)
        )
      }),
      new transports.File({
        filename: 'app.log',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 3,
        tailable: true,
        handleExceptions: true,
        format: format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
      })
    ]
  });
  logger.info('Starting server using options: %O', options);

  const app = createApp({
    logger,
    staticRoot: options.staticRoot
  });

  const server = app.listen(port, () => {
    logger.info('Server is listening: %O', server.address());
  });
};


const createParser = () => yargs
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
        }
      })
      .config(),
    (argv) => serve({
      port: argv.port,
      staticRoot: argv.staticRoot
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
