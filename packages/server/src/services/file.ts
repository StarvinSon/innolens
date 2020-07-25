import {
  createReadStream, createWriteStream, ReadStream,
  promises as fsPromises
} from 'fs';
import { basename, resolve as resolvePath } from 'path';
import { Readable } from 'stream';

import { injectableConstructor, singleton } from '@innolens/resolver/lib-node';
import { file as tmpFile } from 'tmp-promise';

import { UploadDirPath } from '../server-options';


export class FileNotFoundError extends Error {
  public constructor(scope: string, fileId: string) {
    super(`File not found: scope=${scope}, fileId=${fileId}`);
  }
}


@injectableConstructor({
  uploadDirPath: UploadDirPath
})
@singleton()
export class FileService {
  private readonly _dirPath: UploadDirPath;

  public constructor(deps: {
    readonly uploadDirPath: UploadDirPath;
  }) {
    ({
      uploadDirPath: this._dirPath
    } = deps);
  }

  public async saveFile(scope: string, srcStream: Readable): Promise<string> {
    await fsPromises.mkdir(this._dirPath, { recursive: true });
    const file = await tmpFile({
      template: `${scope}-XXXXXX`,
      dir: this._dirPath,
      discardDescriptor: true
    });
    const fileStream = srcStream.pipe(createWriteStream(file.path));
    await new Promise<void>((rs, rj) => {
      const resolve = (): void => {
        fileStream.off('finish', resolve);
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        fileStream.off('error', reject);
        rs();
      };
      const reject = (err: Error): void => {
        fileStream.off('finish', resolve);
        fileStream.off('error', reject);
        rj(err);
      };
      fileStream.once('finish', resolve);
      fileStream.once('error', reject);
    });
    return basename(file.path).slice(scope.length + 1);
  }

  public getFile(scope: string, fileId: string): ReadStream {
    try {
      return createReadStream(resolvePath(this._dirPath, `${scope}-${fileId}`));
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new FileNotFoundError(scope, fileId);
      }
      throw err;
    }
  }
}
