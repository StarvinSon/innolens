import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import { ObjectId } from 'mongodb';

import { Inventory, InventoryCollection } from '../db/inventory';


export { Inventory };

export interface InventoryService {
  findAll(): AsyncIterable<Inventory>;
  findOneById(id: ObjectId): Promise<Inventory | null>;
  insertOne(inventory: Inventory): Promise<void>;
  insertMany(inventories: ReadonlyArray<Omit<Inventory, '_id'>>): Promise<void>
}

export const InventoryService = createToken<InventoryService>('InventoryService');


@injectableConstructor({
  inventoryCollection: InventoryCollection
})
@singleton()
export class InventoryServiceImpl implements InventoryService {
  private readonly _inventoryCollection: InventoryCollection;

  public constructor(options: {
    inventoryCollection: InventoryCollection;
  }) {
    ({
      inventoryCollection: this._inventoryCollection
    } = options);
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

  public async insertMany(inventories: ReadonlyArray<Omit<Inventory, '_id'>>): Promise<void> {
    if (inventories.length === 0) {
      return;
    }
    await this._inventoryCollection.insertMany(inventories.map<Inventory>((inventory) => ({
      ...inventory,
      _id: new ObjectId()
    })));
  }
}
