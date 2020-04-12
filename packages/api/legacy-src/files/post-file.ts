import * as Common from '../common-response';


export const path = '/api/files';


interface ResponseData {
  readonly id: string;
}

export interface ResponseBody extends Common.ResponseBody<ResponseData> {}

export const responseBodyJsonSchema = Common.responseBodyJsonSchema({
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  properties: {
    id: {
      type: 'string'
    }
  }
});

export const toResponseBody = Common.toResponseBodyJson<ResponseData>((obj) => obj);

export const fromResponseBody = Common.fromResponseBodyJson<ResponseData>((json) => json);
