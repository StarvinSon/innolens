import { Db, CollectionCreateOptions, Collection } from 'mongodb';
import { Logger } from 'winston';


interface CollModOptions {
  readonly validationLevel?: NonNullable<CollectionCreateOptions['validationLevel']>;
  readonly validationAction?: NonNullable<CollectionCreateOptions['validationAction']>;
  readonly validator?: NonNullable<CollectionCreateOptions['validator']>;
}

const collMod = async (db: Db, name: string, options: CollModOptions): Promise<void> => {
  const { validationLevel, validationAction, validator } = options;

  const result = await db.command(Object.fromEntries(Object
    .entries({
      collMod: name,
      validationLevel,
      validationAction,
      validator
    })
    .filter(([, val]) => val !== undefined)));

  if (result.ok !== 1) {
    throw new Error(`Failed to execute collMod: ${JSON.stringify(result, undefined, 2)}`);
  }
};


export interface CommonCollectionOptions {
  readonly logger: Logger;
  readonly db: Db;
}


export const createCollection = async <T extends object>(
  db: Db,
  name: string,
  options: CollectionCreateOptions & { logger: Logger }
): Promise<Collection<T>> => {
  const { logger, ...createCollOpts } = options;

  const coll = await db.createCollection<T>(name, createCollOpts);

  const currCollOpts = await coll.options();
  if (
    currCollOpts.validationLevel !== createCollOpts.validationLevel
    || currCollOpts.validationAction !== createCollOpts.validationAction
    || JSON.stringify(currCollOpts.validator) !== JSON.stringify(createCollOpts.validator)
  ) {
    logger.info('Updating %s schema from %O to %O', name, currCollOpts, createCollOpts);
    await collMod(db, name, {
      validationLevel: createCollOpts.validationLevel,
      validationAction: createCollOpts.validationAction,
      validator: createCollOpts.validator
    });
  }

  return coll;
};
