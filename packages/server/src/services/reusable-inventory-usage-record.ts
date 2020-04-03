import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { ObjectId } from 'mongodb';

import { ReusableInventoryUsageRecord, ReusableInventoryUsageRecordCollection } from '../db/reusable-inventory-usage-record';


export { ReusableInventoryUsageRecord };


@injectableConstructor({
  reusableInventoryUsageRecordCollection: ReusableInventoryUsageRecordCollection
})
@singleton()
export class ReusableInventoryUsageRecordService {
  private readonly _reusableInventoryUsageRecordCollection: ReusableInventoryUsageRecordCollection;

  public constructor(deps: {
    reusableInventoryUsageRecordCollection: ReusableInventoryUsageRecordCollection;
  }) {
    ({
      reusableInventoryUsageRecordCollection: this._reusableInventoryUsageRecordCollection
    } = deps);
  }

  public async *findAll(): AsyncIterable<ReusableInventoryUsageRecord> {
    yield* this._reusableInventoryUsageRecordCollection.find({});
  }

  public async findOneById(id: ObjectId): Promise<ReusableInventoryUsageRecord | null> {
    return this._reusableInventoryUsageRecordCollection.findOne({ _id: id });
  }

  public async insertOne(record: ReusableInventoryUsageRecord): Promise<void> {
    await this._reusableInventoryUsageRecordCollection.insertOne(record);
  }

  public async insertMany(records: ReadonlyArray<Omit<ReusableInventoryUsageRecord, '_id'>>): Promise<void> {
    if (records.length === 0) {
      return;
    }
    await this._reusableInventoryUsageRecordCollection
      .insertMany(records.map<ReusableInventoryUsageRecord>((record) => ({
        ...record,
        _id: new ObjectId()
      })));
  }
}
