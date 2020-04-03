import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { ObjectId } from 'mongodb';

import { ReusableInventory, ReusableInventoryCollection } from '../db/reusable-inventory';


export { ReusableInventory };


@injectableConstructor({
  reusableInventoryCollection: ReusableInventoryCollection
})
@singleton()
export class ReusableInventoryService {
  private readonly _reusableInventoryCollection: ReusableInventoryCollection;

  public constructor(deps: {
    reusableInventoryCollection: ReusableInventoryCollection;
  }) {
    ({
      reusableInventoryCollection: this._reusableInventoryCollection
    } = deps);
  }

  public async *findAll(): AsyncIterable<ReusableInventory> {
    yield* this._reusableInventoryCollection.find({});
  }

  public async findOneById(id: ObjectId): Promise<ReusableInventory | null> {
    return this._reusableInventoryCollection.findOne({ _id: id });
  }

  public async insertOne(inventory: ReusableInventory): Promise<void> {
    await this._reusableInventoryCollection.insertOne(inventory);
  }

  public async insertMany(inventories: ReadonlyArray<Omit<ReusableInventory, '_id'>>): Promise<void> {
    if (inventories.length === 0) {
      return;
    }
    await this._reusableInventoryCollection
      .insertMany(inventories.map((inventory) => ({
        ...inventory,
        _id: new ObjectId()
      })));
  }
}
