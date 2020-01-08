import { MongoClient, connect } from 'mongodb';

import { createToken, createSingletonRegistrant } from '../resolver';
import { ServerOptions } from '../server-options';


export type DbClient = MongoClient;


export const createDbClient = async (connectionUri: string): Promise<DbClient> =>
  connect(connectionUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });


export const DbClient = createToken<Promise<DbClient>>(__filename, 'DbClient');

export const registerDbClient = createSingletonRegistrant(
  DbClient,
  { serverOptions: ServerOptions },
  async ({ serverOptions }) => createDbClient(serverOptions.dbConnectionUri)
);
