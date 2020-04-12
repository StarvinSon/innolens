import { ReadStream } from 'fs';

import createHttpError from 'http-errors';
import { BAD_REQUEST } from 'http-status-codes';

import { FileService, FileNotFoundError } from '../../services/file';


namespace fileControllerSyms {
  export const fileService = Symbol('fileService');
}

declare abstract class FileControllerClass {
  public constructor(...args: Array<any>);
  protected abstract readonly [fileControllerSyms.fileService]: FileService;
  protected getFile(scope: string, fileId: string): ReadStream;
}

const createFileController =
  <T extends Function>(base: T): T & (typeof FileControllerClass) => {
    // eslint-disable-next-line max-len
    abstract class FileControllerMixinImpl extends (base as any as new (...args: Array<any>) => any) {
      protected abstract readonly [fileControllerSyms.fileService]: FileService;

      protected getFile(scope: string, fileId: string): ReadStream {
        try {
          return this[fileControllerSyms.fileService].getFile(scope, fileId);
        } catch (err) {
          if (err instanceof FileNotFoundError) {
            throw createHttpError(BAD_REQUEST, err);
          }
          throw err;
        }
      }
    }
    return FileControllerMixinImpl as any;
  };

export const FileController = Object.assign(createFileController, fileControllerSyms);
