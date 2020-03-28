import { singleton, injectableConstructor } from '@innolens/resolver';

import { Space, SpaceCollection } from '../db/space';


export { Space };


@injectableConstructor({
  spaceCollection: SpaceCollection
})
@singleton()
export class SpaceService {
  private readonly _spaceCollection: SpaceCollection;

  public constructor(deps: {
    spaceCollection: SpaceCollection;
  }) {
    ({
      spaceCollection: this._spaceCollection
    } = deps);
  }

  public async importSpaces(spaces: ReadonlyArray<Omit<Space, '_id'>>): Promise<void> {
    await this._spaceCollection
      .bulkWrite(
        spaces.map((space) => ({
          replaceOne: {
            filter: { spaceId: space.spaceId },
            replacement: space,
            upsert: true
          }
        })),
        { ordered: false }
      );
  }

  public async getSpaces(): Promise<Array<Space>> {
    return this._spaceCollection.find({}).toArray();
  }
}
