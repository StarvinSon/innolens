import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import { ObjectId } from 'mongodb';

import { ExpendableInventoryStockRecord, ExpendableInventoryStockRecordCollection } from '../db/expendable-inventory-stock-record';


export { ExpendableInventoryStockRecord };

export interface ExpendableInventoryStockRecordService {
  findAll(): AsyncIterable<ExpendableInventoryStockRecord>;
  findOneById(id: ObjectId): Promise<ExpendableInventoryStockRecord | null>;
  insertOne(expendableInventoryStockRecord: ExpendableInventoryStockRecord): Promise<void>;
  insertMany(expendableInventoryStockRecords: ReadonlyArray<Omit<ExpendableInventoryStockRecord, '_id'>>): Promise<void>
}

export const ExpendableInventoryStockRecordService = createToken<ExpendableInventoryStockRecordService>('ExpendableInventoryStockRecordService');


@injectableConstructor({
  expendableInventoryStockRecordCollection: ExpendableInventoryStockRecordCollection
})
@singleton()
// eslint-disable-next-line max-len
export class ExpendableInventoryStockRecordServiceImpl implements ExpendableInventoryStockRecordService {
  // eslint-disable-next-line max-len
  private readonly _expendableInventoryStockRecordCollection: ExpendableInventoryStockRecordCollection;

  public constructor(deps: {
    expendableInventoryStockRecordCollection: ExpendableInventoryStockRecordCollection;
  }) {
    ({
      expendableInventoryStockRecordCollection: this._expendableInventoryStockRecordCollection
    } = deps);
  }

  public async *findAll(): AsyncIterable<ExpendableInventoryStockRecord> {
    yield* this._expendableInventoryStockRecordCollection.find({});
  }

  public async findOneById(id: ObjectId): Promise<ExpendableInventoryStockRecord | null> {
    return this._expendableInventoryStockRecordCollection.findOne({ _id: id });
  }

  public async insertOne(record: ExpendableInventoryStockRecord): Promise<void> {
    await this._expendableInventoryStockRecordCollection.insertOne(record);
  }

  public async insertMany(records: ReadonlyArray<Omit<ExpendableInventoryStockRecord, '_id'>>): Promise<void> {
    if (records.length === 0) {
      return;
    }
    await this._expendableInventoryStockRecordCollection
      .insertMany(records.map<ExpendableInventoryStockRecord>((record) => ({
        ...record,
        _id: new ObjectId()
      })));
  }
}
