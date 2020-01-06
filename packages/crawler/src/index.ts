import yargs from 'yargs';

import { CrawlerOptions } from './crawler-options';
import { createContext } from './context';
import { initTasks } from './tasks';
import { registerLogger, Logger } from './logger';
import { registerScheduler, Scheduler } from './scheduler';
import { registerServerClient } from './server-client';


const start = (options: CrawlerOptions): void => {
  Promise.resolve()
    .then(async () => {
      const context = createContext();
      context.registerSingletonDependency(CrawlerOptions, () => options);
      registerLogger(context);
      registerScheduler(context);
      registerServerClient(context);

      const logger = context.resolve(Logger);
      logger.info('Starting crawling using options: %O', {
        ...options,
        password: '*'
      });

      initTasks(context);
      const scheduler = context.resolve(Scheduler);
      scheduler.start();
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
      'Start crawler',
      (args) => args
        .options({
          serverHost: {
            type: 'string',
            demandOption: true,
            requiresArg: true
          },
          clientId: {
            type: 'string',
            demandOption: true,
            requiresArg: true
          },
          username: {
            type: 'string',
            demandOption: true,
            requiresArg: true
          },
          password: {
            type: 'string',
            demandOption: true,
            requiresArg: true
          }
        })
        .config(),
      (argv) => start({
        serverHost: argv.serverHost,
        clientId: argv.clientId,
        username: argv.username,
        password: argv.password
      })
    )
    .demandCommand()
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
