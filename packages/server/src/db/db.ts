import { singleton, injectableConstructor } from '@innolens/resolver/node';
import deepEqual from 'deep-equal';
import {
  CollectionCreateOptions, Collection, IndexSpecification,
  Db as RawDb
} from 'mongodb';

import { Logger } from '../logger';

import { DbClient } from './db-client';


export interface DefineCollectionOptions {
  readonly validator?: Required<CollectionCreateOptions>['validator'];
  readonly validationLevel?: Required<CollectionCreateOptions>['validationLevel'];
  readonly validationAction?: Required<CollectionCreateOptions>['validationAction'];
  readonly indexes?: ReadonlyArray<IndexSpecification>;
}


interface CollModOptions {
  readonly validator?: Required<CollectionCreateOptions>['validator'];
  readonly validationLevel?: Required<CollectionCreateOptions>['validationLevel'];
  readonly validationAction?: Required<CollectionCreateOptions>['validationAction'];
}

@injectableConstructor({
  logger: Logger,
  dbClient: DbClient
})
@singleton()
export class Db {
  private readonly _logger: Logger;
  private readonly _dbClient: DbClient;
  private readonly _rawDb: RawDb;

  public constructor(options: {
    logger: Logger;
    dbClient: DbClient;
  }) {
    ({
      logger: this._logger,
      dbClient: this._dbClient
    } = options);
    this._rawDb = this._dbClient.db();
  }

  public async defineCollection<T>(
    name: string,
    options: DefineCollectionOptions
  ): Promise<Collection<T>> {
    const coll = await this._rawDb.createCollection<T>(name);

    // Update validation options
    const currCollOpts = await coll.options();
    const validationOptsIsSame = [
      'validationLevel',
      'validationAction',
      'validator'
    ]
      .every((field) => {
        const currVal = currCollOpts[field];
        const expectVal = (options as any)[field];
        return deepEqual(currVal, expectVal, { strict: true });
      });
    if (!validationOptsIsSame) {
      this._logger.info(
        'Updating %s schema from %j to %j',
        name,
        {
          validationLevel: currCollOpts.validationLevel,
          validationAction: currCollOpts.validationAction,
          validator: currCollOpts.validator
        }, {
          validationLevel: options.validationLevel,
          validationAction: options.validationAction,
          validator: options.validator
        }
      );
      await this._collMod(name, {
        validationLevel: options.validationLevel,
        validationAction: options.validationAction,
        validator: options.validator
      });
    }

    // Update index options
    const indexesToDrop: Array<IndexSpecification> = await coll.indexes();
    const indexesToCreate: Array<IndexSpecification> = options.indexes?.slice() ?? [];

    for (
      let indexToCreateIdx = indexesToCreate.length - 1;
      indexToCreateIdx >= 0;
      indexToCreateIdx -= 1
    ) {
      const indexToCreate = indexesToCreate[indexToCreateIdx];

      const indexToDropIdx = indexesToDrop.findIndex((index) =>
        deepEqual(index.key, indexToCreate.key, { strict: true }));
      if (indexToDropIdx >= 0) {
        const indexToDrop = indexesToDrop[indexToDropIdx];

        const indexIsSame = [
          'name',
          'background',
          'unique',
          'partialFilterExpression',
          'sparse',
          'expireAfterSeconds',
          'storageEngine',
          'weights',
          'default_language',
          'language_override',
          'textIndexVersion',
          '2dsphereIndexVersion',
          'bits',
          'min',
          'max',
          'bucketSize',
          'collation',
          'wildcardProjection'
        ]
          .every((field) => {
            const dropVal = (indexToDrop as any)[field];
            const createVal = (indexToCreate as any)[field];
            switch (field) {
              case 'name': {
                return (
                  createVal === undefined
                  || deepEqual(dropVal, createVal, { strict: true })
                );
              }
              default: {
                return deepEqual(dropVal, createVal, { strict: true });
              }
            }
          });

        if (indexIsSame) {
          indexesToDrop.splice(indexToDropIdx, 1);
          indexesToCreate.splice(indexToCreateIdx, 1);
        }
      }
    }

    const idIndexToCreateIdx = indexesToCreate.findIndex((index) =>
      deepEqual(index.key, { _id: 1 }, { strict: true }));
    const idIndexToDropIdx = indexesToDrop.findIndex((index) =>
      deepEqual(index.key, { _id: 1 }, { strict: true }));
    if (idIndexToCreateIdx < 0 && idIndexToDropIdx >= 0) {
      indexesToDrop.splice(idIndexToDropIdx, 1);
    }

    if (indexesToDrop.length > 0) {
      this._logger.info('Dropping index in collection %j: %j', name, indexesToDrop);
      await Promise.all(indexesToDrop.map((index) =>
        coll.dropIndex(index.name!)));
    }
    if (indexesToCreate.length > 0) {
      this._logger.info('Creating index in collection %j: %j', name, indexesToCreate);
      await coll.createIndexes(indexesToCreate);
    }

    return coll;
  }

  private async _collMod(name: string, options: CollModOptions): Promise<void> {
    const result = await this._rawDb.command(Object.fromEntries(Object
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
  }
}
