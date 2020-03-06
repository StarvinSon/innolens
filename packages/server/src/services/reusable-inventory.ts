import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import { ObjectId } from 'mongodb';

import { ReusableInventory, ReusableInventoryCollection } from '../db/reusable-inventory';


export { ReusableInventory };

export interface ReusableInventoryService {
  findAll(): AsyncIterable<ReusableInventory>;
  findOneById(id: ObjectId): Promise<ReusableInventory | null>;
  insertOne(reusableInventory: ReusableInventory): Promise<void>;
  insertMany(reusableInventories: ReadonlyArray<Omit<ReusableInventory, '_id'>>): Promise<void>
}

export const ReusableInventoryService = createToken<ReusableInventoryService>('ReusableInventoryService');


@injectableConstructor({
  reusableInventoryCollection: ReusableInventoryCollection
})
@singleton()
export class ReusableInventoryServiceImpl implements ReusableInventoryService {
  private readonly _reusableInventoryCollection: ReusableInventoryCollection;

  public constructor(options: {
    reusableInventoryCollection: ReusableInventoryCollection;
  }) {
    ({
      reusableInventoryCollection: this._reusableInventoryCollection
    } = options);
  }

  public async *findAll(): AsyncIterable<ReusableInventory> {
    yield* this._reusableInventoryCollection.find({});
  }

  public async findOneById(id: ObjectId): Promise<ReusableInventory | null> {
    return this._reusableInventoryCollection.findOne({ _id: id });
  }

  public async insertOne(reusableInventory: ReusableInventory): Promise<void> {
    await this._reusableInventoryCollection.insertOne(reusableInventory);
  }

  public async insertMany(reusableInventories: ReadonlyArray<Omit<ReusableInventory, '_id'>>): Promise<void> {
    if (reusableInventories.length === 0) {
      return;
    }
    await this._reusableInventoryCollection.insertMany(reusableInventories.map(
      (reusableInventory) => ({
        ...reusableInventory,
        _id: new ObjectId()
      })
    ));
  }
}
