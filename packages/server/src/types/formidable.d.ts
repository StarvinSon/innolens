declare module 'formidable/lib/file' {
  import { File as FileDef } from 'formidable';

  const File: {
    new(...args: Array<any>): FileDef;
    prototype: FileDef;
  };
  type File = FileDef;
  // eslint-disable-next-line import/no-default-export
  export default File;
}
