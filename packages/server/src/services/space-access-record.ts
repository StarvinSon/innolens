import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import { ObjectId } from 'mongodb';

import { SpaceAccessRecord, SpaceAccessRecordCollection } from '../db/space-access-record';


export { SpaceAccessRecord };

export interface SpaceAccessRecordService {
  findAll(): AsyncIterable<SpaceAccessRecord>;
  findOneById(id: ObjectId): Promise<SpaceAccessRecord | null>;
  insertOne(spaceAccess: SpaceAccessRecord): Promise<void>;
  insertMany(spaceAccesses: ReadonlyArray<Omit<SpaceAccessRecord, '_id'>>): Promise<void>
}

export const SpaceAccessRecordService =
  createToken<SpaceAccessRecordService>('SpaceAccessRecordService');


@injectableConstructor({
  spaceAccessRecordCollection: SpaceAccessRecordCollection
})
@singleton()
export class SpaceAccessRecordServiceImpl implements SpaceAccessRecordService {
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
