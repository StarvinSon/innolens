import { createToken } from '@innolens/resolver/lib-node';


export type ModelUri = string;
export const ModelUri = createToken<ModelUri>('ModelUri');

export type UploadDirPath = string;
export const UploadDirPath = createToken<UploadDirPath>('UploadDirPath');


export interface ServerOptions {
  readonly dbConnectionUri: string;
  readonly modelsUri: ModelUri;
  readonly port: number;
  readonly staticRootPath: string;
  readonly uploadDirPath: UploadDirPath;
}

export const ServerOptions = createToken<ServerOptions>('ServerOptions');
