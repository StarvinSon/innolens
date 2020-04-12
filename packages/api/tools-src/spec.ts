import { promises as fsPromises } from 'fs';

import yaml from 'yaml';

import { Schema } from './schema';


export interface EndpointSpec {
  readonly name: string;

  readonly method: string;
  readonly path: string;
  readonly query?: {
    readonly [key: string]: {
      readonly required?: boolean;
      readonly schema: Schema
    }
  };

  readonly authentication?: {
    readonly type: 'bearer';
  }

  readonly requestBody?: {
    readonly contentType: string;
    readonly schema: Schema;
  };

  readonly responseBody?: {
    readonly data: {
      readonly schema: Schema;
    };
  }

  readonly scripts?: {
    readonly client?: string;
    readonly controller?: string;
  };
}

export const readEndpointSpec = async (path: string): Promise<EndpointSpec> =>
  yaml.parse(await fsPromises.readFile(
    path,
    { encoding: 'utf8' }
  ));

export const parseEndpointSpecPath = (path: string): {
  readonly statics: ReadonlyArray<string>;
  readonly names: ReadonlyArray<string>;
} => {
  const comps = path.split(/:([^/]*)/);
  return {
    statics: comps.filter((_, i) => i % 2 === 0),
    names: comps.filter((_, i) => i % 2 === 1)
  };
};


export interface IndexSpec {
  readonly name: string;

  readonly scripts?: {
    readonly client?: string;
    readonly controller?: string;
  };
}

export const readIndexSpec = async (path: string): Promise<IndexSpec> =>
  yaml.parse(await fsPromises.readFile(
    path,
    { encoding: 'utf8' }
  ));
