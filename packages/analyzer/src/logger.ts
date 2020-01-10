import {
  Logger as WinstonLogger, createLogger as createWinstonLogger,
  format, transports
} from 'winston';

import { createToken, createSingletonRegistrant } from './resolver';


export type Logger = WinstonLogger;


export const createLogger = (): Logger =>
  createWinstonLogger({
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
        handleExceptions: true,
        format: format.uncolorize(),
        filename: 'analyzer.log',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 3,
        tailable: true
      })
    ]
  });


export const Logger = createToken<Logger>(__filename, 'Logger');

export const registerLogger = createSingletonRegistrant(Logger, createLogger);
