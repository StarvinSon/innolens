import { ToJson } from '../conversion';


export const path = '/api/members';


const requestFileColumns = [
  'member_id',
  'name',
  'department',
  'type_of_study',
  'study_programme',
  'year_of_study',
  'affiliated_student_interest_group',
  'membership_start_time',
  'membership_end_time'
] as const;

export interface RequestBody {
  file: ReadonlyArray<Readonly<Record<(typeof requestFileColumns)[number], string>>>;
}

export const requestBodyJsonSchema: object = {
  type: 'object',
  additionalProperties: false,
  required: ['file'],
  properties: {
    file: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: requestFileColumns,
        properties: Object.fromEntries(requestFileColumns.map((name) => [name, { type: 'string' }]))
      }
    }
  }
};

export const fromRequestBodyJson = (json: ToJson<RequestBody>): RequestBody => json;
