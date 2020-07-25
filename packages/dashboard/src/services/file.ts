import * as Api from '@innolens/api-legacy/lib-web';
import { injectableConstructor } from '@innolens/resolver/lib-web';

import { ServerService } from './server';


@injectableConstructor({
  serverClient: ServerService
})
export class FileService {
  private readonly _serverClient: ServerService;

  public constructor(deps: {
    readonly serverClient: ServerService
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
