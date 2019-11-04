import {
  connect, Db, Collection, MongoClient
} from 'mongodb';
import { Logger } from 'winston';

import { Writable } from '../utils/object';

import { Member, createMembersCollection } from './members';

export { Member } from './members';


export interface AppDbClient<T> {
  readonly client: MongoClient;
  readonly db: AppDb<T>;
}

export type AppDb<T> = {
  readonly db: Db;
} & {
  readonly [K in keyof T]: Collection<T[K]>;
};


export interface AppDbClientOptions {
  readonly logger: Logger;
  readonly connectionUri: string;
}

export interface DefaultDbCollectionMap {
  readonly members: Member;
}

export const createAppDbClient = async (
  options: AppDbClientOptions
): Promise<AppDbClient<DefaultDbCollectionMap>> => {
  const { logger, connectionUri } = options;

  const client = await connect(connectionUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const db = client.db();

  const appDbClient: AppDbClient<DefaultDbCollectionMap> = await Object
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
      } as Omit<AppDbClient<DefaultDbCollectionMap>, 'db'> & { db: Writable<AppDb<DefaultDbCollectionMap>> })
    );

  return appDbClient;
};
