import { compare, hash } from 'bcrypt';
import { ObjectId } from 'mongodb';

import { createToken, createAsyncSingletonRegistrant } from '../resolver';
import { User, UserCollection } from '../db/user';


export { User };

export interface UserService {
  findById(id: ObjectId): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByCredentials(credential: UserCredential): Promise<User | null>;
  insert(userWithPassword: UserWithPassword): Promise<void>;
}

export interface UserWithPassword extends Omit<User, 'passwordHash'> {
  readonly password: string;
}

export interface UserCredential {
  readonly username: string;
  readonly password: string;
}


const SALT_ROUNDS: number = 10;

export class UserServiceImpl implements UserService {
  private readonly _userCollection: UserCollection;

  public constructor(options: {
    userCollection: UserCollection
  }) {
    ({
      userCollection: this._userCollection
    } = options);
  }

  public async findById(id: ObjectId): Promise<User | null> {
    return this._userCollection.findOne({ _id: id });
  }

  public async findByUsername(username: string): Promise<User | null> {
    return this._userCollection.findOne({
      username
    });
  }

  public async findByCredentials(credential: UserCredential): Promise<User | null> {
    const user = await this.findByUsername(credential.username);
    return user !== null && (await compare(credential.password, user.passwordHash))
      ? user : null;
  }

  public async insert(userWithPassword: UserWithPassword): Promise<void> {
    const { password, ...userWithoutPassword } = userWithPassword;
    const user: User = {
      ...userWithoutPassword,
      passwordHash: await hash(password, SALT_ROUNDS)
    };
    await this._userCollection.insertOne(user);
  }
}


export const UserService = createToken<Promise<UserService>>(__filename, 'UserService');

export const registerUserService = createAsyncSingletonRegistrant(
  UserService,
  { userCollection: UserCollection },
  async (opts) => {
    const service = new UserServiceImpl(opts);

    const rootUser = await service.findByUsername('root');
    if (rootUser === null) {
      await service.insert({
        _id: new ObjectId(),
        username: 'root',
        password: 'innoroot',
        name: 'Root Administrator'
      });
    }

    return service;
  }
);
