import {
  connect, Db as MongoDb, MongoClient,
  CollectionCreateOptions, IndexOptions, Collection
} from 'mongodb';

import {
  createToken, DependencyCreator, createSingletonDependencyRegistrant,
  AppContext
} from '../app-context';
import { Logger } from '../log';


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


export type Db = MongoDb;

export const Db = createToken<Promise<Db>>(module, 'Db');

export const createDb: DependencyCreator<Promise<Db>> = async (appCtx) => {
  const client = await appCtx.resolve(DbClient);
  return client.db();
};

export const registerDb = createSingletonDependencyRegistrant(Db, createDb);


interface CollModOptions {
  readonly validationLevel?: NonNullable<CollectionCreateOptions['validationLevel']>;
  readonly validationAction?: NonNullable<CollectionCreateOptions['validationAction']>;
  readonly validator?: NonNullable<CollectionCreateOptions['validator']>;
}

const collMod = async (db: Db, name: string, options: CollModOptions): Promise<void> => {
  const result = await db.command(Object.fromEntries(Object
    .entries({
      collMod: name,
      validationLevel: options.validationLevel,
      validationAction: options.validationAction,
      validator: options.validator
    })
    .filter(([, val]) => val !== undefined)));

  if (result.ok !== 1) {
    throw new Error(`Failed to execute collMod: ${JSON.stringify(result, undefined, 2)}`);
  }
};


export interface CreateCollectionOptions extends CollectionCreateOptions {
  indexes?: ReadonlyArray<object | readonly [object, IndexOptions?]>;
}

export const createCollection = async <T extends object>(
  appCtx: AppContext,
  name: string,
  options: CreateCollectionOptions
): Promise<Collection<T>> => {
  const {
    indexes,
    ...createCollOpts
  } = options;

  const db = await appCtx.resolve(Db);

  const coll = await db.createCollection<T>(name, createCollOpts);

  const currCollOpts = await coll.options();
  if (
    currCollOpts.validationLevel !== createCollOpts.validationLevel
    || currCollOpts.validationAction !== createCollOpts.validationAction
    || JSON.stringify(currCollOpts.validator) !== JSON.stringify(createCollOpts.validator)
  ) {
    const logger = appCtx.resolve(Logger);
    logger.info('Updating %s schema from %O to %O', name, {
      validationLevel: currCollOpts.validationLevel,
      validationAction: currCollOpts.validationAction,
      validator: currCollOpts.validator
    }, {
      validationLevel: createCollOpts.validationLevel,
      validationAction: createCollOpts.validationAction,
      validator: createCollOpts.validator
    });
    await collMod(db, name, {
      validationLevel: createCollOpts.validationLevel,
      validationAction: createCollOpts.validationAction,
      validator: createCollOpts.validator
    });
  }

  if (indexes !== undefined && indexes.length > 0) {
    await Promise.all(indexes.map(async (indexOrOpts) => {
      const [index, opts] = (Array.isArray as (a: any) => a is ReadonlyArray<any>)(indexOrOpts)
        ? indexOrOpts : [indexOrOpts];
      await coll.createIndex(index, opts);
    }));
  }

  return coll;
};
