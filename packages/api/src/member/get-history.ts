export const path = '/api/member/history';


export interface MemberCountRecord {
  readonly time: string;
  readonly counts: {
    readonly [category: string]: number;
  }
}

export const MemberCountRecord: object = {
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
};


export interface MemberCountHistory {
  readonly categories: ReadonlyArray<string>;
  readonly records: ReadonlyArray<MemberCountRecord>;
}

export const MemberCountHistory: object = {
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
      items: MemberCountRecord
    }
  }
};


export { MemberCountHistory as Response };
