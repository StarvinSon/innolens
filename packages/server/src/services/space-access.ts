import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import { ObjectId } from 'mongodb';

import { SpaceAccess, SpaceAccessCollection } from '../db/space-access';


export { SpaceAccess };

export interface SpaceAccessService {
  findAll(): AsyncIterable<SpaceAccess>;
  findOneById(id: ObjectId): Promise<SpaceAccess | null>;
  insertOne(spaceAccess: SpaceAccess): Promise<void>;
  insertMany(spaceAccesses: ReadonlyArray<Omit<SpaceAccess, '_id'>>): Promise<void>
}

export const SpaceAccessService = createToken<SpaceAccessService>('SpaceAccessService');


@injectableConstructor({
  spaceAccessCollection: SpaceAccessCollection
})
@singleton()
export class SpaceAccessServiceImpl implements SpaceAccessService {
  private readonly _spaceAccessCollection: SpaceAccessCollection;

  public constructor(options: {
    spaceAccessCollection: SpaceAccessCollection;
  }) {
    ({
      spaceAccessCollection: this._spaceAccessCollection
    } = options);
  }

  public async *findAll(): AsyncIterable<SpaceAccess> {
    yield* this._spaceAccessCollection.find({});
  }

  public async findOneById(id: ObjectId): Promise<SpaceAccess | null> {
    return this._spaceAccessCollection.findOne({ _id: id });
  }

  public async insertOne(spaceAccess: SpaceAccess): Promise<void> {
    await this._spaceAccessCollection.insertOne(spaceAccess);
  }

  public async insertMany(spaceAccesses: ReadonlyArray<Omit<SpaceAccess, '_id'>>): Promise<void> {
    if (spaceAccesses.length === 0) {
      return;
    }
    await this._spaceAccessCollection.insertMany(
      spaceAccesses.map((spaceAccess) => ({
        ...spaceAccess,
        _id: new ObjectId()
      }))
    );
  }
}
