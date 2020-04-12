import { ToJson } from '../conversion';


export const path = '/api/spaces';


export interface RequestBody {
  readonly fileId: string;
}

export type RequestBodyJson = ToJson<RequestBody>;

export const requestBodyJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['fileId'],
  properties: {
    fileId: {
      type: 'string'
    }
  }
};

export const toRequestBodyJson = (obj: RequestBody): RequestBodyJson => obj;

export const fromRequestBodyJson = (json: RequestBodyJson): RequestBody => json;


export interface FileRecord {
  readonly space_id: string;
  readonly space_name: string;
}

export type FileRecordJson = ToJson<FileRecord>;

export const fileRecordJsonSchema: object = {
  type: 'object',
  additionalProperties: false,
  required: ['space_id', 'space_name'],
  properties: {
    space_id: {
      type: 'string'
    },
    space_name: {
      type: 'string'
    }
  }
};

export const fromFileRecordJson = (json: FileRecordJson): FileRecord => json;