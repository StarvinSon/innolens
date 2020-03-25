import { formatISO, parseISO } from 'date-fns';

import { ToJson } from '../conversion';


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


export interface Response {
  readonly categories: ReadonlyArray<string>;
  readonly records: ReadonlyArray<{
    readonly time: Date;
    readonly counts: {
      readonly [category: string]: number;
    }
  }>;
}

export const Response: object = {
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
};


export const stringifyResponse =
  (obj: Response): ToJson<Response> => ({
    categories: obj.categories,
    records: obj.records.map((record) => ({
      time: formatISO(record.time),
      counts: record.counts
    }))
  });

export const parseResponse =
  (json: ToJson<Response>): Response => ({
    categories: json.categories,
    records: json.records.map((record) => ({
      time: parseISO(record.time),
      counts: record.counts
    }))
  });
