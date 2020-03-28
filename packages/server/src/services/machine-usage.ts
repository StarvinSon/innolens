import { singleton, injectableConstructor } from '@innolens/resolver';
import { ObjectId } from 'mongodb';

import { MachineUsage, MachineUsageCollection } from '../db/machine-usage';


export { MachineUsage };


@injectableConstructor({
  machineUsageCollection: MachineUsageCollection
})
@singleton()
export class MachineUsageService {
  private readonly _machineUsageCollection: MachineUsageCollection;

  public constructor(deps: {
    machineUsageCollection: MachineUsageCollection;
  }) {
    ({
      machineUsageCollection: this._machineUsageCollection
    } = deps);
  }

  public async *findAll(): AsyncIterable<MachineUsage> {
    yield* this._machineUsageCollection.find({});
  }

  public async findOneById(id: ObjectId): Promise<MachineUsage | null> {
    return this._machineUsageCollection.findOne({ _id: id });
  }

  public async insertOne(usage: MachineUsage): Promise<void> {
    await this._machineUsageCollection.insertOne(usage);
  }

  public async insertMany(usageList: ReadonlyArray<Omit<MachineUsage, '_id'>>): Promise<void> {
    if (usageList.length === 0) {
      return;
    }
    await this._machineUsageCollection
      .insertMany(usageList.map<MachineUsage>((machineUsage) => ({
        ...machineUsage,
        _id: new ObjectId()
      })));
  }
}
