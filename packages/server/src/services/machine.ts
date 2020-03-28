import { singleton, injectableConstructor } from '@innolens/resolver';
import { ObjectId } from 'mongodb';

import { Machine, MachineCollection } from '../db/machine';


export { Machine };


@injectableConstructor({
  machineCollection: MachineCollection
})
@singleton()
export class MachineService {
  private readonly _machineCollection: MachineCollection;

  public constructor(deps: {
    machineCollection: MachineCollection;
  }) {
    ({
      machineCollection: this._machineCollection
    } = deps);
  }

  public async *findAll(): AsyncIterable<Machine> {
    yield* this._machineCollection.find({});
  }

  public async findOneById(id: ObjectId): Promise<Machine | null> {
    return this._machineCollection.findOne({ _id: id });
  }

  public async insertOne(machine: Machine): Promise<void> {
    await this._machineCollection.insertOne(machine);
  }

  public async insertMany(machines: ReadonlyArray<Omit<Machine, '_id'>>): Promise<void> {
    if (machines.length === 0) {
      return;
    }
    await this._machineCollection
      .insertMany(machines.map<Machine>((machine) => ({
        ...machine,
        _id: new ObjectId()
      })));
  }
}
