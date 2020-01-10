import yargs from 'yargs';

import { AnalyzerOptions } from './analyzer-options';
import { createResolver, Registrant } from './resolver';
import { AllTasks, registerAllTasks } from './tasks';
import { registerLogger, Logger } from './logger';
import { registerScheduler, Scheduler } from './scheduler';
import { registerServerClient } from './server-client';


const registrants: ReadonlyArray<Registrant> = [
  registerLogger,
  registerScheduler,
  registerServerClient,
  registerAllTasks
];

const start = (options: AnalyzerOptions): void => {
  Promise.resolve()
    .then(async () => {
      const resolver = createResolver();
      resolver.registerSingleton(AnalyzerOptions, () => options);
      for (const register of registrants) {
        register(resolver);
      }

      const logger = resolver.resolve(Logger);
      logger.info('Starting analyzer using options: %O', {
        ...options,
        password: '*'
      });

      const [scheduler, tasks] = resolver.resolve([Scheduler, AllTasks] as const);
      for (const task of tasks) {
        scheduler.addTask(task);
      }
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
