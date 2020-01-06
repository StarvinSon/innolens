import {
  Logger as WinstonLogger, createLogger as createWinstonLogger,
  format, transports
} from 'winston';

import { createToken, ContextFunction, createSingletonDependencyRegistrant } from './context';


export type Logger = WinstonLogger;

export const Logger = createToken<Logger>(__filename, 'Logger');

export const createLogger: ContextFunction<Logger> = () => createWinstonLogger({
  format: format.combine(
    format.timestamp(),
    format.splat(),
    format.colorize({
      level: true
    }),
    format.printf(({ level, timestamp, message }) =>
      `${timestamp} [${level}] ${message}`)
  ),
  transports: [
    new transports.Console({
      handleExceptions: true
    }),
    new transports.File({
      handleExceptions: true,
      format: format.uncolorize(),
      filename: 'app.log',
      maxsize: 10 * 1024 * 1024, /* 10MB */
      maxFiles: 10,
      tailable: true
    })
  ]
});

export const registerLogger = createSingletonDependencyRegistrant(Logger, createLogger);
