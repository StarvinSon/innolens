import { formatISO, parseISO } from 'date-fns';

import * as CommonResponse from '../common-response';


export const path = '/api/members/count-history';

export const categories = [
  'department',
  'typeOfStudy',
  'studyProgramme',
  'yearOfStudy',
  'affiliatedStudentInterestGroup'
] as const;

export type Category = (typeof categories)[number];

export const ranges = [
  'past7Days',
  'past30Days',
  'past6Months',
  'past12Months'
] as const;

export type Range = (typeof ranges)[number];


interface ResponseData {
  readonly categories: ReadonlyArray<string>;
  readonly records: ReadonlyArray<{
    readonly time: Date;
    readonly counts: {
      readonly [category: string]: number;
    }
  }>;
}

export interface ResponseBody extends CommonResponse.ResponseBody<ResponseData> {}

export const responseBodyJsonSchema = CommonResponse.responseBodyJsonSchema({
  type: 'object',
  additionalProperties: false,
  required: ['categories', 'records'],
  properties: {
    categories: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
    records: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['time', 'counts'],
        properties: {
          time: {
            type: 'string'
          },
          counts: {
            type: 'object',
            additionalProperties: {
              type: 'number'
            }
          }
        }
      }
    }
  }
});

export const toResponseBodyJson = CommonResponse.toResponseBodyJson<ResponseData>((obj) => ({
  categories: obj.categories,
  records: obj.records.map((record) => ({
    time: formatISO(record.time),
    counts: record.counts
  }))
}));

export const fromResponseBodyJson = CommonResponse.fromResponseBodyJson<ResponseData>((json) => ({
  categories: json.categories,
  records: json.records.map((record) => ({
    time: parseISO(record.time),
    counts: record.counts
  }))
}));
