import {
  createToken, decorate, map,
  singleton, name, injectableFactory
} from '@innolens/resolver';
import { MongoClient, connect } from 'mongodb';

import { ServerOptions } from '../server-options';


export interface DbClient extends MongoClient {}

export const DbClient = createToken<DbClient>('DbClient');


export const createDbClient = decorate(
  name('createDbClient'),
  injectableFactory(map(ServerOptions, (serOpts) => serOpts.dbConnectionUri)),
  singleton(),
  async (connectionUri: string): Promise<DbClient> =>
    connect(connectionUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
);
