import {
  decorate, singleton, name,
  injectableFactory
} from '@innolens/resolver/node';
import {
  Logger as WinstonLogger, createLogger as createWinstonLogger,
  format, transports
} from 'winston';


export type Logger = WinstonLogger;

export const Logger = decorate(
  name('Logger'),
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
