import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import { ObjectId } from 'mongodb';

import { MachineUsage, MachineUsageCollection } from '../db/machine-usage';


export { MachineUsage };

export interface MachineUsageService {
  findAll(): AsyncIterable<MachineUsage>;
  findOneById(id: ObjectId): Promise<MachineUsage | null>;
  insertOne(machineUsage: MachineUsage): Promise<void>;
  insertMany(machineUsageList: ReadonlyArray<Omit<MachineUsage, '_id'>>): Promise<void>
}

export const MachineUsageService = createToken<MachineUsageService>('MachineUsageService');


@injectableConstructor({
  machineUsageCollection: MachineUsageCollection
})
@singleton()
export class MachineUsageServiceImpl implements MachineUsageService {
  private readonly _machineUsageCollection: MachineUsageCollection;

  public constructor(options: {
    machineUsageCollection: MachineUsageCollection;
  }) {
    ({
      machineUsageCollection: this._machineUsageCollection
    } = options);
  }

  public async *findAll(): AsyncIterable<MachineUsage> {
    yield* this._machineUsageCollection.find({});
  }

  public async findOneById(id: ObjectId): Promise<MachineUsage | null> {
    return this._machineUsageCollection.findOne({ _id: id });
  }

  public async insertOne(machineUsage: MachineUsage): Promise<void> {
    await this._machineUsageCollection.insertOne(machineUsage);
  }

  public async insertMany(machineUsageList: ReadonlyArray<Omit<MachineUsage, '_id'>>): Promise<void> {
    if (machineUsageList.length === 0) {
      return;
    }
    await this._machineUsageCollection.insertMany(machineUsageList.map<MachineUsage>((machineUsage) => ({
      ...machineUsage,
      _id: new ObjectId()
    })));
  }
}