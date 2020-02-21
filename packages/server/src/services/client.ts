import { createToken, singleton, injectableConstructor } from '@innolens/resolver';
import { compare, hash } from 'bcrypt';
import { ObjectId } from 'mongodb';

import { Client, ClientType, ClientCollection } from '../db/client';


export { Client, ClientType };

export interface ClientService {
  findById(id: ObjectId): Promise<Client | null>;
  findByPublicId(publicId: string): Promise<Client | null>;
  findByCredentials(credentials: ClientCredentials): Promise<Client | null>;
  insert(clientWithSecret: ClientWithSecret): Promise<Client>;
}

export const ClientService = createToken<ClientService>('ClientService');

export interface ClientCredentials {
  readonly publicId: string;
  readonly secret: string;
}

export interface ClientWithSecret extends Omit<Client, 'secretHash'> {
  readonly secret: string;
}


const SECRET_SALT_ROUNDS: number = 10;

@injectableConstructor({
  clientCollection: ClientCollection
})
@singleton()
export class ClientServiceImpl implements ClientService {
  private readonly _clientCollection: ClientCollection;

  public constructor(options: {
    clientCollection: ClientCollection;
  }) {
    ({
      clientCollection: this._clientCollection
    } = options);
  }

  public async findById(id: ObjectId): Promise<Client | null> {
    return this._clientCollection.findOne({ _id: id });
  }

  public async findByPublicId(publicId: string): Promise<Client | null> {
    return this._clientCollection.findOne({ publicId });
  }

  public async findByCredentials(credentials: ClientCredentials): Promise<Client | null> {
    const client = await this.findByPublicId(credentials.publicId);
    const match = (
      client !== null
      && (
        (client.type === ClientType.PUBLIC && credentials.secret === '')
        || (client.type === ClientType.CONFIDENTIAL
          && (await compare(credentials.secret, client.secretHash)))
      )
    );
    return match ? client : null;
  }

  public async insert(clientWithSecret: ClientWithSecret): Promise<Client> {
    const { secret, ...clientWithoutSecret } = clientWithSecret;
    const client: Client = {
      ...clientWithoutSecret,
      secretHash: clientWithoutSecret.type === ClientType.PUBLIC
        ? ''
        : await hash(secret, SECRET_SALT_ROUNDS)
    };
    await this._clientCollection.insertOne(client);
    return client;
  }
}
