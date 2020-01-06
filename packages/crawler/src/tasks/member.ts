import {
  uniqueNamesGenerator, adjectives, names,
  animals
} from 'unique-names-generator';

import { ContextFunction } from '../context';
import { Task } from '../utils/scheduler/task';
import { IntervalSchedule } from '../utils/scheduler/schedules/interval';
import { Scheduler } from '../scheduler';
import { ServerClient } from '../server-client';
import { Logger } from '../logger';


const nameAndAnimals = names.concat(animals);

const randomName = (): string => uniqueNamesGenerator({
  dictionaries: [adjectives, nameAndAnimals],
  length: 2,
  separator: ' ',
  style: 'capital'
});

export const initMemberTask: ContextFunction = (ctx) => {
  const [
    logger,
    scheduler,
    serverClient
  ] = ctx.resolveAll(
    Logger,
    Scheduler,
    ServerClient
  );

  scheduler.addTask(new Task(
    'Add Member',
    new IntervalSchedule(0, 60 * 1000 /* 1min */),
    async () => {
      // Test
      const text = await serverClient.authenticatedFetchOk('/api/members').then((res) => res.text());
      logger.info('%s %O', randomName(), text);
    }
  ));
};
