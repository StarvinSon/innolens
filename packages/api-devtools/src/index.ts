import { join, dirname } from 'path';
import { promisify } from 'util';

import glob from 'glob';

import {
  IndexSpec, EndpointSpec, readIndexSpec,
  readEndpointSpec
} from './spec';

const globPromise = promisify(glob);


const specsDirPath = join(__dirname, '../spec');

export const getSpecs = async (specDirName: string): Promise<[IndexSpec, Array<EndpointSpec>]> => {
  const indexSpec = await readIndexSpec(join(specsDirPath, specDirName, 'index.yaml'));

  const endptSpecFilenames = (await globPromise('!(index).yaml', { cwd: join(specsDirPath, specDirName) }))
    .map((filename) => filename.slice(0, -'.yaml'.length));

  const endptSpecs = await Promise.all(endptSpecFilenames.map(async (filename) =>
    readEndpointSpec(join(specsDirPath, specDirName, `${filename}.yaml`))));

  return [indexSpec, endptSpecs];
};

export const getAllSpecs = async (): Promise<Array<[IndexSpec, Array<EndpointSpec>]>> => {
  const specDirNames = (await globPromise('*/index.yaml', { cwd: specsDirPath }))
    .map((path) => dirname(path));

  // eslint-disable-next-line max-len
  return Promise.all(specDirNames.map<Promise<[IndexSpec, Array<EndpointSpec>]>>(async (specDirName) =>
    getSpecs(specDirName)));
};
