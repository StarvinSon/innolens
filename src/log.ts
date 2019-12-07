import {
  Logger as WinstonLogger, createLogger as createWinstonLogger,
  format, transports
} from 'winston';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from './app-context';


export type Logger = WinstonLogger;

export const Logger = createToken<Logger>(module, 'Logger');

export const createLogger: DependencyCreator<Logger> = () =>
  createWinstonLogger({
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

export const registerLogger = createSingletonDependencyRegistrant(Logger, createLogger);
