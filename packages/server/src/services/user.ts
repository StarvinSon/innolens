import { compare, hash } from 'bcrypt';
import { ObjectId } from 'mongodb';

import { createToken, DependencyCreator, createSingletonDependencyRegistrant } from '../app-context';
import { User, UserCollection } from '../db/user';


export { User };

export interface UserService {
  findById(id: ObjectId): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByCredentials(credential: UserCredential): Promise<User | null>;
  insert(user: UserWithPassword): Promise<void>;
}

export const UserService = createToken<Promise<UserService>>(module, 'UserService');

export interface UserWithPassword extends Omit<User, 'passwordHash'> {
  readonly password: string;
}

export interface UserCredential {
  readonly username: string;
  readonly password: string;
}

const SALT_ROUNDS: number = 10;

export const createUserService: DependencyCreator<Promise<UserService>> = async (appCtx) => {
  const userCollection = await appCtx.resolve(UserCollection);

  const findById: UserService['findById'] = async (id) =>
    userCollection.findOne({ _id: id });

  const findByUsername: UserService['findByUsername'] = async (username) =>
    userCollection.findOne({
      username
    });

  const findByCredentials: UserService['findByCredentials'] = async (credential) => {
    const user = await findByUsername(credential.username);
    return user !== null && (await compare(credential.password, user.passwordHash))
      ? user : null;
  };

  const insert: UserService['insert'] = async (userWithPassword) => {
    const { password, ...userWithoutPassword } = userWithPassword;
    const user: User = {
      ...userWithoutPassword,
      passwordHash: await hash(password, SALT_ROUNDS)
    };
    await userCollection.insertOne(user);
  };

  const rootUser = await findByUsername('root');
  if (rootUser === null) {
    await insert({
      _id: new ObjectId(),
      username: 'root',
      password: 'innoroot',
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
export const registerUserService = createSingletonDependencyRegistrant(UserService, createUserService);
