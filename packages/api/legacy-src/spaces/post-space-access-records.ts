import { formatISO, parseISO } from 'date-fns';

import { ToJson } from '../conversion';


export const path = (spaceId: string): string => `/api/spaces/${spaceId}/access-records`;


export interface RequestBody {
  readonly deleteFromTime: Date | null;
  readonly deleteToTime: Date | null;
  readonly fileId: string;
}

export const requestBodyJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['deleteFromTime', 'deleteToTime', 'fileId'],
  properties: {
    deleteFromTime: {
      oneOf: [{
        type: 'string'
      }, {
        type: 'null'
      }]
    },
    deleteToTime: {
      oneOf: [{
        type: 'string'
      }, {
        type: 'null'
      }]
    },
    fileId: {
      type: 'string'
    }
  }
};

export const toRequestBodyJson = (obj: RequestBody): ToJson<RequestBody> => ({
  ...obj,
  deleteFromTime: obj.deleteFromTime === null ? null : formatISO(obj.deleteFromTime),
  deleteToTime: obj.deleteToTime === null ? null : formatISO(obj.deleteToTime)
});

export const fromRequestBodyJson = (json: ToJson<RequestBody>): RequestBody => ({
  ...json,
  deleteFromTime: json.deleteFromTime === null ? null : parseISO(json.deleteFromTime),
  deleteToTime: json.deleteToTime === null ? null : parseISO(json.deleteToTime)
});


export interface FileRecord {
  readonly time: Date;
  readonly member_id: string;
  readonly action: 'enter' | 'exit';
}

export type FileRecordJson = ToJson<FileRecord>;

export const fileRecordJsonSchema: object = {
  type: 'object',
  additionalProperties: false,
  required: ['time', 'member_id', 'action'],
  properties: {
    time: {
      type: 'string'
    },
    member_id: {
      type: 'string'
    },
    action: {
      enum: ['enter', 'exit']
    }
  }
};

export const fromFileRecordJson = (json: FileRecordJson): FileRecord => ({
  ...json,
  time: parseISO(json.time)
});
