import { ObjectId } from 'mongodb';
import { compare, hash } from 'bcrypt';

import { User, UsersCollection } from '../db/users';
import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';


export { User };

export interface UsersService {
  findById(id: ObjectId): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByCredentials(credential: UserCredential): Promise<User | null>;
  insert(user: UserWithPassword): Promise<void>;
}

export const UsersService = createToken<Promise<UsersService>>(module, 'UsersService');

export interface UserWithPassword extends Omit<User, 'passwordHash'> {
  readonly password: string;
}

export interface UserCredential {
  readonly username: string;
  readonly password: string;
}

const SALT_ROUNDS: number = 10;

export const createUsersService: DependencyCreator<Promise<UsersService>> = async (appCtx) => {
  const usersCollection = await appCtx.resolve(UsersCollection);

  const findById: UsersService['findById'] = async (id) =>
    usersCollection.findOne({ _id: id });

  const findByUsername: UsersService['findByUsername'] = async (username) =>
    usersCollection.findOne({
      username
    });

  const findByCredentials: UsersService['findByCredentials'] = async (credential) => {
    const user = await findByUsername(credential.username);
    return user !== null && (await compare(credential.password, user.passwordHash))
      ? user : null;
  };

  const insert: UsersService['insert'] = async (userWithPassword) => {
    const { password, ...userWithoutPassword } = userWithPassword;
    const user: User = {
      ...userWithoutPassword,
      passwordHash: await hash(password, SALT_ROUNDS)
    };
    await usersCollection.insertOne(user);
  };

  const rootUser = await findByUsername('root');
  if (rootUser === null) {
    await insert({
      _id: new ObjectId(),
      username: 'root',
      password: 'root123',
      name: 'Root Administrator'
    });
  }

  return {
    findById,
    findByUsername,
    findByCredentials,
    insert
  };
};

// eslint-disable-next-line max-len
export const registerUsersService = createSingletonDependencyRegistrant(UsersService, createUsersService);
