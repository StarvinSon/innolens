import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { ObjectId } from 'mongodb';

import {
  Inventory, InventoryCollection, ExpendableInventory,
  ReusableInventory
} from '../db/inventory';


export { Inventory };

export type InventoryWithoutId = Omit<ExpendableInventory, '_id'> | Omit<ReusableInventory, '_id'>;


@injectableConstructor({
  inventoryCollection: InventoryCollection
})
@singleton()
export class InventoryService {
  private readonly _inventoryCollection: InventoryCollection;

  public constructor(deps: {
    inventoryCollection: InventoryCollection;
  }) {
    ({
      inventoryCollection: this._inventoryCollection
    } = deps);
  }

  public async *findAll(): AsyncIterable<Inventory> {
    yield* this._inventoryCollection.find({});
  }

  public async findOneById(id: ObjectId): Promise<Inventory | null> {
    return this._inventoryCollection.findOne({ _id: id });
  }

  public async insertOne(inventory: Inventory): Promise<void> {
    await this._inventoryCollection.insertOne(inventory);
  }

  public async insertMany(inventories: ReadonlyArray<InventoryWithoutId>): Promise<void> {
    if (inventories.length === 0) {
      return;
    }
    await this._inventoryCollection
      .insertMany(inventories.map<Inventory>((inventory) => ({
        ...inventory,
        _id: new ObjectId()
      })));
  }
}
