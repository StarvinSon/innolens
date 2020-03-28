export const path = '/api/spaces';


export const requestFileColumns = [
  'space_id',
  'space_name'
] as const;

export interface Request {
  readonly file: ReadonlyArray<Readonly<Record<(typeof requestFileColumns)[number], string>>>;
}

export const Request: object = {
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
