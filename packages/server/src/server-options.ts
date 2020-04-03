import { createToken } from '@innolens/resolver/node';


export interface ServerOptions {
  readonly port: number;
  readonly staticRoot: string;
  readonly dbConnectionUri: string;
}

export const ServerOptions = createToken<ServerOptions>('ServerOptions');
