import { MongoClient, connect } from 'mongodb';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';


export interface DbClientOptions {
  readonly connectionUri: string;
}

export type DbClient = MongoClient;

export const DbClient = createToken<Promise<DbClient>>(module, 'DbClient');

// eslint-disable-next-line max-len
export const createDbClient: DependencyCreator<Promise<DbClient>, [DbClientOptions]> = async (appCtx, options) => {
  const { connectionUri } = options;

  return connect(connectionUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
};

export const registerDbClient = createSingletonDependencyRegistrant(DbClient, createDbClient);
