import { createToken } from './resolver';


export interface ServerOptions {
  readonly port: number;
  readonly staticRoot: string;
  readonly dbConnectionUri: string;
}


export const ServerOptions = createToken<ServerOptions>(__filename, 'ServerOptions');
