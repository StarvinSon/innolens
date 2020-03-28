import {
  decorate, map, singleton,
  name, injectableFactory
} from '@innolens/resolver';
import { MongoClient, connect } from 'mongodb';

import { ServerOptions } from '../server-options';


export interface DbClient extends MongoClient {}

export const DbClient = decorate(
  name('DbClient'),
  injectableFactory(map(ServerOptions, (serOpts) => serOpts.dbConnectionUri)),
  singleton(),
  async (connectionUri: string): Promise<DbClient> =>
    connect(connectionUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
);
