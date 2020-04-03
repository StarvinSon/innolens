import { singleton, injectableConstructor } from '@innolens/resolver/node';
import { ObjectId } from 'mongodb';

import { SpaceAccessRecord, SpaceAccessRecordCollection } from '../db/space-access-record';


export { SpaceAccessRecord };


@injectableConstructor({
  spaceAccessRecordCollection: SpaceAccessRecordCollection
})
@singleton()
export class SpaceAccessRecordService {
  private readonly _spaceAccessRecordCollection: SpaceAccessRecordCollection;

  public constructor(deps: {
    spaceAccessRecordCollection: SpaceAccessRecordCollection;
  }) {
    ({
      spaceAccessRecordCollection: this._spaceAccessRecordCollection
    } = deps);
  }

  public async *findAll(): AsyncIterable<SpaceAccessRecord> {
    yield* this._spaceAccessRecordCollection.find({});
  }

  public async findOneById(id: ObjectId): Promise<SpaceAccessRecord | null> {
    return this._spaceAccessRecordCollection.findOne({ _id: id });
  }

  public async insertOne(record: SpaceAccessRecord): Promise<void> {
    await this._spaceAccessRecordCollection.insertOne(record);
  }

  public async insertMany(records: ReadonlyArray<Omit<SpaceAccessRecord, '_id'>>): Promise<void> {
    if (records.length === 0) {
      return;
    }
    await this._spaceAccessRecordCollection
      .insertMany(records.map<SpaceAccessRecord>((record) => ({
        ...record,
        _id: new ObjectId()
      })));
  }
}
