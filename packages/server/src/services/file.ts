import { createReadStream, createWriteStream, ReadStream } from 'fs';
import { basename, resolve as resolvePath } from 'path';
import { Readable } from 'stream';

import { injectableConstructor, singleton } from '@innolens/resolver/node';
import { file as tmpFile } from 'tmp-promise';


export class FileNotFoundError extends Error {
  public constructor(scope: string, fileId: string) {
    super(`File not found: scope=${scope}, fileId=${fileId}`);
  }
}


@injectableConstructor()
@singleton()
export class FileService {
  public readonly directory = resolvePath('./uploads');

  public async saveFile(scope: string, srcStream: Readable): Promise<string> {
    const file = await tmpFile({
      template: `${scope}-XXXXXX`,
      dir: this.directory,
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
      return createReadStream(resolvePath(this.directory, `${scope}-${fileId}`));
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new FileNotFoundError(scope, fileId);
      }
      throw err;
    }
  }
}
