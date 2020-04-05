import * as Api from '@innolens/api/web';
import { injectableConstructor } from '@innolens/resolver/web';

import { ServerClient } from './server-client';


@injectableConstructor({
  serverClient: ServerClient
})
export class FileService {
  private readonly _serverClient: ServerClient;

  public constructor(deps: {
    readonly serverClient: ServerClient
  }) {
    ({
      serverClient: this._serverClient
    } = deps);
  }

  public async upload(file: File): Promise<string> {
    const json = await this._serverClient.fetchJsonOk(
      Api.Files.PostFile.path,
      {
        method: 'POST',
        body: file
      }
    );
    const { data } = Api.Files.PostFile.fromResponseBody(json);
    return data.id;
  }
}
