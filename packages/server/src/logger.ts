import {
  createToken, decorate, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import {
  Logger as WinstonLogger, createLogger as createWinstonLogger,
  format, transports
} from 'winston';


export type Logger = WinstonLogger;

export const Logger = createToken<Logger>('Logger');


export const createLogger = decorate(
  name('createLogger'),
  injectableFactory(),
  singleton(),
  (): Logger => createWinstonLogger({
    format: format.combine(
      format.timestamp(),
      format.splat(),
      format.colorize(),
      format.printf(({ timestamp, level, message }) =>
        `${timestamp} [${level}] ${message}`)
    ),
    transports: [
      new transports.Console({
        handleExceptions: true
      }),
      new transports.File({
        filename: 'server.log',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 3,
        tailable: true,
        handleExceptions: true,
        format: format.uncolorize()
      })
    ]
  })
);
