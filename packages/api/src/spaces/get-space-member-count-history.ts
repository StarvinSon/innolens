import { parseISO, formatISO } from 'date-fns';

import * as Common from '../common-response';
import { ToJson } from '../conversion';


export const path = (spaceId: string): string => `/api/spaces/${spaceId}/member-count-history`;


export const groupByQueryValues = [
  'department',
  'typeOfStudy',
  'studyProgramme',
  'yearOfStudy',
  'affiliatedStudentInterestGroup'
] as const;

export type GroupByQueryValue = (typeof groupByQueryValues)[number];


interface ResponseData {
  readonly groups: ReadonlyArray<string>;
  readonly records: ReadonlyArray<{
    readonly periodStartTime: Date;
    readonly periodEndTime: Date;
    readonly enterCounts: Readonly<Record<string, number>>;
    readonly uniqueEnterCounts: Readonly<Record<string, number>>;
    readonly exitCounts: Readonly<Record<string, number>>;
    readonly uniqueExitCounts: Readonly<Record<string, number>>;
    readonly stayCounts: Readonly<Record<string, number>>;
    readonly uniqueStayCounts: Readonly<Record<string, number>>;
  }>;
}

export interface ResponseBody extends Common.ResponseBody<ResponseData> {}

export type ResponseBodyJson = ToJson<ResponseBody>;

export const responseBodyJsonSchema: readonly [object, Readonly<Record<string, object>>] = [
  Common.responseBodyJsonSchema({
    type: 'object',
    required: ['groups', 'records'],
    additionalProperties: false,
    properties: {
      groups: {
        type: 'array',
        items: {
          type: 'string'
        }
      },
      records: {
        type: 'array',
        items: {
          type: 'object',
          required: [
            'periodStartTime',
            'periodEndTime',
            'enterCounts',
            'uniqueEnterCounts',
            'exitCounts',
            'uniqueExitCounts',
            'stayCounts',
            'uniqueStayCounts'
          ],
          additionalProperties: false,
          properties: {
            periodStartTime: {
              type: 'string'
            },
            periodEndTime: {
              type: 'string'
            },
            enterCounts: {
              $ref: 'counts'
            },
            uniqueEnterCounts: {
              $ref: 'counts'
            },
            exitCounts: {
              $ref: 'counts'
            },
            uniqueExitCounts: {
              $ref: 'counts'
            },
            stayCounts: {
              $ref: 'counts'
            },
            uniqueStayCounts: {
              $ref: 'counts'
            }
          }
        }
      }
    }
  }),
  {
    counts: {
      type: 'object',
      additionalProperties: {
        type: 'number'
      }
    }
  }
];

export const fromResponseBodyJson = Common.fromResponseBodyJson<ResponseData>((json) => ({
  ...json,
  records: json.records.map((record) => ({
    ...record,
    periodStartTime: parseISO(record.periodStartTime),
    periodEndTime: parseISO(record.periodEndTime)
  }))
}));

export const toResponseBodyJson = Common.toResponseBodyJson<ResponseData>((obj) => ({
  ...obj,
  records: obj.records.map((record) => ({
    ...record,
    periodStartTime: formatISO(record.periodStartTime),
    periodEndTime: formatISO(record.periodEndTime)
  }))
}));
