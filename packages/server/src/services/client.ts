import { compare, hash } from 'bcrypt';
import { ObjectId } from 'mongodb';

import { createToken, createSingletonDependencyRegistrant, DependencyCreator } from '../app-context';
import { Client, ClientType, ClientCollection } from '../db/client';


export { Client, ClientType };

export interface ClientService {
  findById(id: ObjectId): Promise<Client | null>;
  findByPublicId(publicId: string): Promise<Client | null>;
  findByCredentials(credentials: ClientCredentials): Promise<Client | null>;
  insert(client: ClientWithSecret): Promise<Client>;
}

export const ClientService = createToken<Promise<ClientService>>(module, 'ClientService');

export interface ClientCredentials {
  readonly publicId: string;
  readonly secret: string;
}

export interface ClientWithSecret extends Omit<Client, 'secretHash'> {
  readonly secret: string;
}

const SECRET_SALT_ROUNDS: number = 10;

export const createClientService: DependencyCreator<Promise<ClientService>> = async (appCtx) => {
  const clientCollection = await appCtx.resolve(ClientCollection);

  const findById: ClientService['findById'] = async (id) =>
    clientCollection.findOne({ _id: id });

  const findByPublicId: ClientService['findByPublicId'] = async (publicId) =>
    clientCollection.findOne({ publicId });

  const findByCredentials: ClientService['findByCredentials'] = async (credentials) => {
    const client = await findByPublicId(credentials.publicId);
    return (
      client !== null
      && (
        (client.type === ClientType.PUBLIC && credentials.secret === '')
        || (client.type === ClientType.CONFIDENTIAL
          && (await compare(credentials.secret, client.secretHash)))
      )
    ) ? client : null;
  };

  const insert: ClientService['insert'] = async (clientWithSecret) => {
    const { secret, ...clientWithoutSecret } = clientWithSecret;
    const client: Client = {
      ...clientWithoutSecret,
      secretHash: clientWithoutSecret.type === ClientType.PUBLIC
        ? ''
        : await hash(secret, SECRET_SALT_ROUNDS)
    };
    await clientCollection.insertOne(client);
    return client;
  };

  const publicClient = await findByPublicId('default');
  if (publicClient === null) {
    await insert({
      _id: new ObjectId(),
      publicId: 'default',
      type: ClientType.PUBLIC,
      secret: '',
      name: 'Default Public Client'
    });
  }

  return {
    findById,
    findByPublicId,
    findByCredentials,
    insert
  };
};

// eslint-disable-next-line max-len
export const registerClientService = createSingletonDependencyRegistrant(ClientService, createClientService);
