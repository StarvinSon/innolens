import {
  connect, Db, Collection, MongoClient
} from 'mongodb';
import { Logger } from 'winston';

import { Writable } from '../utils/object';

import { Member, createMembersCollection } from './members';


export interface AppDbClient {
  readonly client: MongoClient;
  readonly db: AppDb;
}

export interface AppDb {
  readonly db: Db;
  readonly members: Collection<Member>;
  // Other collections...
}


export interface AppDbClientOptions {
  readonly logger: Logger;
  readonly connectionUri: string;
}

export const createAppDbClient = async (options: AppDbClientOptions) => {
  const { logger, connectionUri } = options;

  const client = await connect(connectionUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const db = client.db();

  const appDbClient: AppDbClient = await Object
    .entries({
      members: createMembersCollection({ logger, db })
    })
    .reduce(
      async (result, [collName, collPromise]) => {
        const partialAppDbClient = await result;
        partialAppDbClient.db[collName] = await collPromise;
        return partialAppDbClient;
      },
      Promise.resolve({
        client,
        db: {
          db
        }
      } as Omit<AppDbClient, 'db'> & { db: Writable<AppDb> })
    );

  return appDbClient;
};
