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
export class ExpendableInventoryStockRecordServiceImpl implements ExpendableInventoryStockRecordService {
  private readonly eExpendableInventoryStockRecordCollection: ExpendableInventoryStockRecordCollection;

  public constructor(options: {
    expendableInventoryStockRecordCollection: ExpendableInventoryStockRecordCollection;
  }) {
    ({
      expendableInventoryStockRecordCollection: this.eExpendableInventoryStockRecordCollection
    } = options);
  }

  public async *findAll(): AsyncIterable<ExpendableInventoryStockRecord> {
    yield* this.eExpendableInventoryStockRecordCollection.find({});
  }

  public async findOneById(id: ObjectId): Promise<ExpendableInventoryStockRecord | null> {
    return this.eExpendableInventoryStockRecordCollection.findOne({ _id: id });
  }

  public async insertOne(expendableInventoryStockRecord: ExpendableInventoryStockRecord): Promise<void> {
    await this.eExpendableInventoryStockRecordCollection.insertOne(expendableInventoryStockRecord);
  }

  public async insertMany(expendableInventoryStockRecords: ReadonlyArray<Omit<ExpendableInventoryStockRecord, '_id'>>): Promise<void> {
    if (expendableInventoryStockRecords.length === 0) {
      return;
    }
    await this.eExpendableInventoryStockRecordCollection.insertMany(expendableInventoryStockRecords.map<ExpendableInventoryStockRecord>((expendableInventoryStockRecord) => ({
      ...expendableInventoryStockRecord,
      _id: new ObjectId()
    })));
  }
}
