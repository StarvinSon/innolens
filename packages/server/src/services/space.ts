import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import { ObjectId } from 'mongodb';

import { Space, SpaceCollection } from '../db/space';


export { Space };

export interface SpaceService {
  findAll(): AsyncIterable<Space>;
  findOneById(id: ObjectId): Promise<Space | null>;
  insertOne(space: Space): Promise<void>;
  insertMany(spaces: ReadonlyArray<Omit<Space, '_id'>>): Promise<void>
}

export const SpaceService = createToken<SpaceService>('SpaceService');


@injectableConstructor({
  spaceCollection: SpaceCollection
})
@singleton()
export class SpaceServiceImpl implements SpaceService {
  private readonly _spaceCollection: SpaceCollection;

  public constructor(options: {
    spaceCollection: SpaceCollection;
  }) {
    ({
      spaceCollection: this._spaceCollection
    } = options);
  }

  public async *findAll(): AsyncIterable<Space> {
    yield* this._spaceCollection.find({});
  }

  public async findOneById(id: ObjectId): Promise<Space | null> {
    return this._spaceCollection.findOne({ _id: id });
  }

  public async insertOne(space: Space): Promise<void> {
    await this._spaceCollection.insertOne(space);
  }

  public async insertMany(spaces: ReadonlyArray<Omit<Space, '_id'>>): Promise<void> {
    if (spaces.length === 0) {
      return;
    }
    await this._spaceCollection.insertMany(spaces.map<Space>((space) => ({
      ...space,
      _id: new ObjectId()
    })));
  }
}
