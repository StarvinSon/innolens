import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import { ObjectId } from 'mongodb';

import { ReusableInventoryUsage, ReusableInventoryUsageCollection } from '../db/reusable-inventory-usage';


export { ReusableInventoryUsage };

export interface ReusableInventoryUsageService {
  findAll(): AsyncIterable<ReusableInventoryUsage>;
  findOneById(id: ObjectId): Promise<ReusableInventoryUsage | null>;
  insertOne(reusableInventoryUsage: ReusableInventoryUsage): Promise<void>;
  insertMany(reusableInventoryUsageList: ReadonlyArray<Omit<ReusableInventoryUsage, '_id'>>): Promise<void>
}

export const ReusableInventoryUsageService = createToken<ReusableInventoryUsageService>('ReusableInventoryUsageService');


@injectableConstructor({
  reusableInventoryUsageCollection: ReusableInventoryUsageCollection
})
@singleton()
export class ReusableInventoryUsageServiceImpl implements ReusableInventoryUsageService {
  private readonly _reusableInventoryUsageCollection: ReusableInventoryUsageCollection;

  public constructor(options: {
    reusableInventoryUsageCollection: ReusableInventoryUsageCollection;
  }) {
    ({
      reusableInventoryUsageCollection: this._reusableInventoryUsageCollection
    } = options);
  }

  public async *findAll(): AsyncIterable<ReusableInventoryUsage> {
    yield* this._reusableInventoryUsageCollection.find({});
  }

  public async findOneById(id: ObjectId): Promise<ReusableInventoryUsage | null> {
    return this._reusableInventoryUsageCollection.findOne({ _id: id });
  }

  public async insertOne(reusableInventoryUsage: ReusableInventoryUsage): Promise<void> {
    await this._reusableInventoryUsageCollection.insertOne(reusableInventoryUsage);
  }

  public async insertMany(reusableInventoryUsageList: ReadonlyArray<Omit<ReusableInventoryUsage, '_id'>>): Promise<void> {
    if (reusableInventoryUsageList.length === 0) {
      return;
    }
    await this._reusableInventoryUsageCollection.insertMany(
      reusableInventoryUsageList.map((reusableInventoryUsage) => ({
        ...reusableInventoryUsage,
        _id: new ObjectId()
      }))
    );
  }
}
